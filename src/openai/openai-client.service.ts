import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

@Injectable()
export class OpenAIClientService implements OnModuleInit {
    private openai: OpenAI;
    private readonly logger = new Logger(OpenAIClientService.name);

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        this.openai = new OpenAI({
            apiKey: this.configService.get<string>('OPENAI_API_KEY'),
        });
    }

    // --- SCHEMAS ---

    private understandingSchema = z.object({
        intent: z.enum(['ENGINE_SPEC', 'CHIP_TUNING', 'COMPATIBILITY', 'MAINTENANCE', 'OTHER']),
        entities: z.object({
            make: z.string().nullable(),
            model: z.string().nullable(),
            year: z.number().nullable(),
            trim: z.string().nullable(),
            engine: z.string().nullable(),
            engine_code: z.string().nullable(),
            fuel: z.string().nullable(),
        }),
        missing_fields: z.array(z.string()),
        next_action: z.enum(['ANSWER', 'ASK_CLARIFY', 'ESCALATE']),
        confidence: z.number(),
        clarify_question: z.string().nullable(),
        safety_notes: z.array(z.string()).nullable(),
    });

    private composerSchema = z.object({
        reply_text: z.string(),
        confidence: z.number(),
        follow_up_question: z.string().nullable(),
        used_sources: z.object({
            cars: z.array(z.string()),
            qa_entries: z.array(z.string()),
        }),
    });

    private knowledgeSchema = z.object({
        scope_type: z.enum(['CAR', 'ENGINE', 'MODEL', 'GENERIC']),
        scope_id: z.string().nullable(),
        intent: z.string(),
        question_canonical: z.string(),
        answer: z.string(),
        tags: z.array(z.string()),
        status: z.literal('VERIFIED'),
        versioning: z.object({
            should_replace_existing: z.boolean(),
            replaces_qa_id: z.string().nullable(),
        }),
    });

    // --- METHODS ---

    async understandMessage(text: string, context: any, carCandidate: any = null) {
        const model = this.configService.get('OPENAI_MODEL_UNDERSTAND', 'gpt-4o');

        // Feature flag: poder apagar OpenAI sin tocar código
        const featureOpenAI = this.configService.get<string>('FEATURE_OPENAI', 'true') === 'true';
        if (!featureOpenAI) {
            return this.fallbackUnderstanding(text, context, carCandidate);
        }

        try {
            const completion = await this.openai.chat.completions.create({
                model,
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert car mechanic bot. Analyze the user's message.
Context: ${JSON.stringify(context || {})}
Candidate Car: ${JSON.stringify(carCandidate || {})}
Extract intent and entities. If critical info is missing (like missing year for spec), ask clarify.
Extract fuel type (Diesel, Petrol, Hybrid, etc) if mentioned.
Confidence 0.0-1.0.`,
                    },
                    { role: 'user', content: text },
                ],
                response_format: zodResponseFormat(this.understandingSchema, 'understanding_response'),
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error('No content returned from OpenAI');
            return JSON.parse(content);
        } catch (e: any) {
            const code = e?.code || e?.error?.code;
            const type = e?.type || e?.error?.type;
            const status = e?.status;

            // si no hay cuota o hay rate limit, NO tires 500: hacé fallback
            if (code === 'insufficient_quota' || type === 'insufficient_quota' || status === 429) {
                this.logger.warn(`OpenAI unavailable (${code || status}). Using fallback understanding.`);
                return this.fallbackUnderstanding(text, context, carCandidate);
            }

            this.logger.error('Error in understandMessage', e);
            return this.fallbackUnderstanding(text, context, carCandidate);
        }
    }

    private fallbackUnderstanding(text: string, context: any, carCandidate: any) {
        const lower = text.toLowerCase();

        const intent =
            lower.includes('motor') ? 'ENGINE_SPEC'
                : (lower.includes('ecu') ? 'COMPATIBILITY'
                    : (lower.includes('chip') || lower.includes('chipear') || lower.includes('repro') || lower.includes('stage')) ? 'CHIP_TUNING'
                        : 'OTHER');

        const yearMatch = text.match(/\b(19\d{2}|20\d{2})\b/);
        const year = yearMatch ? Number(yearMatch[1]) : null;

        // cilindrada 2.4 / 1.6 etc (opcional como “engine” para filtrar)
        const dispMatch = text.match(/\b(\d\.\d)\b/);
        const engine = dispMatch ? dispMatch[1] : null;

        let fuel: string | null = null;
        if (lower.includes('diesel') || lower.includes('diésel') || lower.includes('tdi') || lower.includes('hdi')) fuel = 'Diesel';
        if (lower.includes('nafta') || lower.includes('petrol') || lower.includes('gasolina') || lower.includes('tsi') || lower.includes('v6')) fuel = 'Petrol';

        // make/model en fallback: lo resolvemos por DB (ver VehiclesService)
        return {
            intent,
            entities: {
                make: null,
                model: null,
                year,
                trim: null,
                engine,
                engine_code: null,
                fuel,
            },
            missing_fields: [],
            next_action: 'ANSWER',
            confidence: 0.4,
            clarify_question: null,
            safety_notes: ['openai_fallback'],
        };
    }

    async composeAnswer(question: string, carInfo: any, qaEntries: any[], notes: string) {
        const model = this.configService.get('OPENAI_MODEL_COMPOSE', 'gpt-4o');
        try {
            const completion = await this.openai.chat.completions.create({
                model,
                messages: [
                    {
                        role: 'system', content: `You are a helper bot. Compose a short WhatsApp-style reply based strictly on provided data.
            Car Info: ${JSON.stringify(carInfo)}
            Q/A Entries: ${JSON.stringify(qaEntries)}
            Notes: ${notes}
            
            Do not invent facts. If unsure, low confidence.` },
                    { role: 'user', content: question },
                ],
                response_format: zodResponseFormat(this.composerSchema, 'composer_response'),
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error('No content returned from OpenAI');
            return JSON.parse(content);
        } catch (e) {
            this.logger.error('Error in composeAnswer', e);
            throw e;
        }
    }

    async writeKnowledge(ticketData: any, expertAnswer: string, detectedCar: any) {
        const model = this.configService.get('OPENAI_MODEL_KNOWLEDGE', 'gpt-4o');
        try {
            const completion = await this.openai.chat.completions.create({
                model,
                messages: [
                    {
                        role: 'system', content: `You are a technical documenter. Transform the Expert's raw answer into a structured Q/A entry.
            Ticket: ${JSON.stringify(ticketData)}
            Expert Answer: ${expertAnswer}
            Detected Car: ${JSON.stringify(detectedCar)}
            
            Canonical question should be general enough. Scope should be specific if possible.` },
                    { role: 'user', content: 'Extract knowledge.' },
                ],
                response_format: zodResponseFormat(this.knowledgeSchema, 'knowledge_response'),
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error('No content returned from OpenAI');
            return JSON.parse(content);
        } catch (e) {
            this.logger.error('Error in writeKnowledge', e);
            throw e;
        }
    }

    async createEmbedding(text: string): Promise<number[]> {
        const model = this.configService.get('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small');
        try {
            const response = await this.openai.embeddings.create({
                model,
                input: text,
            });
            return response.data[0].embedding;
        } catch (e) {
            this.logger.error('Error in createEmbedding', e);
            throw e;
        }
    }

    private pickCandidateSchema = z.object({
        vehicleId: z.string().nullable(),
    });

    async pickCandidate(userText: string, candidates: any[]) {
        const model = this.configService.get('OPENAI_MODEL_UNDERSTAND', 'gpt-4o');

        // Armamos una lista simple para que no “alucine”
        const compact = candidates.map((c: any) => ({
            vehicleId: c.vehicleId ?? c.id,
            engineName: c.engineName,
            engineTypeCode: c.engineTypeCode,
            fuel: c.fuel,
            versionText: c.versionText,
        }));

        const completion = await this.openai.chat.completions.create({
            model,
            messages: [
                {
                    role: 'system',
                    content:
                        `You must choose exactly one candidate vehicleId from the provided list or null.\n` +
                        `Never invent ids. If user text is insufficient, return null.`,
                },
                {
                    role: 'user',
                    content: `User said: ${userText}\nCandidates: ${JSON.stringify(compact)}`,
                },
            ],
            response_format: zodResponseFormat(this.pickCandidateSchema, 'pick_candidate_response'),
        });

        const content = completion.choices[0].message.content;
        if (!content) return { vehicleId: null };
        return JSON.parse(content);
    }

}
