"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OpenAIClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIClientService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = __importDefault(require("openai"));
const zod_1 = require("openai/helpers/zod");
const zod_2 = require("zod");
let OpenAIClientService = OpenAIClientService_1 = class OpenAIClientService {
    configService;
    openai;
    logger = new common_1.Logger(OpenAIClientService_1.name);
    constructor(configService) {
        this.configService = configService;
    }
    onModuleInit() {
        this.openai = new openai_1.default({
            apiKey: this.configService.get('OPENAI_API_KEY'),
        });
    }
    understandingSchema = zod_2.z.object({
        intent: zod_2.z.enum(['ENGINE_SPEC', 'CHIP_TUNING', 'COMPATIBILITY', 'MAINTENANCE', 'OTHER']),
        entities: zod_2.z.object({
            make: zod_2.z.string().nullable(),
            model: zod_2.z.string().nullable(),
            year: zod_2.z.number().nullable(),
            trim: zod_2.z.string().nullable(),
            engine: zod_2.z.string().nullable(),
            engine_code: zod_2.z.string().nullable(),
            fuel: zod_2.z.string().nullable(),
        }),
        missing_fields: zod_2.z.array(zod_2.z.string()),
        next_action: zod_2.z.enum(['ANSWER', 'ASK_CLARIFY', 'ESCALATE']),
        confidence: zod_2.z.number(),
        clarify_question: zod_2.z.string().nullable(),
        safety_notes: zod_2.z.array(zod_2.z.string()).nullable(),
    });
    composerSchema = zod_2.z.object({
        reply_text: zod_2.z.string(),
        confidence: zod_2.z.number(),
        follow_up_question: zod_2.z.string().nullable(),
        used_sources: zod_2.z.object({
            cars: zod_2.z.array(zod_2.z.string()),
            qa_entries: zod_2.z.array(zod_2.z.string()),
        }),
    });
    knowledgeSchema = zod_2.z.object({
        scope_type: zod_2.z.enum(['CAR', 'ENGINE', 'MODEL', 'GENERIC']),
        scope_id: zod_2.z.string().nullable(),
        intent: zod_2.z.string(),
        question_canonical: zod_2.z.string(),
        answer: zod_2.z.string(),
        tags: zod_2.z.array(zod_2.z.string()),
        status: zod_2.z.literal('VERIFIED'),
        versioning: zod_2.z.object({
            should_replace_existing: zod_2.z.boolean(),
            replaces_qa_id: zod_2.z.string().nullable(),
        }),
    });
    async understandMessage(text, context, carCandidate = null) {
        const model = this.configService.get('OPENAI_MODEL_UNDERSTAND', 'gpt-4o');
        const featureOpenAI = this.configService.get('FEATURE_OPENAI', 'true') === 'true';
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
                response_format: (0, zod_1.zodResponseFormat)(this.understandingSchema, 'understanding_response'),
            });
            const content = completion.choices[0].message.content;
            if (!content)
                throw new Error('No content returned from OpenAI');
            return JSON.parse(content);
        }
        catch (e) {
            const code = e?.code || e?.error?.code;
            const type = e?.type || e?.error?.type;
            const status = e?.status;
            if (code === 'insufficient_quota' || type === 'insufficient_quota' || status === 429) {
                this.logger.warn(`OpenAI unavailable (${code || status}). Using fallback understanding.`);
                return this.fallbackUnderstanding(text, context, carCandidate);
            }
            this.logger.error('Error in understandMessage', e);
            return this.fallbackUnderstanding(text, context, carCandidate);
        }
    }
    fallbackUnderstanding(text, context, carCandidate) {
        const lower = text.toLowerCase();
        const intent = lower.includes('motor') ? 'ENGINE_SPEC'
            : (lower.includes('ecu') ? 'COMPATIBILITY'
                : (lower.includes('chip') || lower.includes('chipear') || lower.includes('repro') || lower.includes('stage')) ? 'CHIP_TUNING'
                    : 'OTHER');
        const yearMatch = text.match(/\b(19\d{2}|20\d{2})\b/);
        const year = yearMatch ? Number(yearMatch[1]) : null;
        const dispMatch = text.match(/\b(\d\.\d)\b/);
        const engine = dispMatch ? dispMatch[1] : null;
        let fuel = null;
        if (lower.includes('diesel') || lower.includes('diésel') || lower.includes('tdi') || lower.includes('hdi'))
            fuel = 'Diesel';
        if (lower.includes('nafta') || lower.includes('petrol') || lower.includes('gasolina') || lower.includes('tsi') || lower.includes('v6'))
            fuel = 'Petrol';
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
    async composeAnswer(question, carInfo, qaEntries, notes) {
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
            
            Do not invent facts. If unsure, low confidence.`
                    },
                    { role: 'user', content: question },
                ],
                response_format: (0, zod_1.zodResponseFormat)(this.composerSchema, 'composer_response'),
            });
            const content = completion.choices[0].message.content;
            if (!content)
                throw new Error('No content returned from OpenAI');
            return JSON.parse(content);
        }
        catch (e) {
            this.logger.error('Error in composeAnswer', e);
            throw e;
        }
    }
    async writeKnowledge(ticketData, expertAnswer, detectedCar) {
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
            
            Canonical question should be general enough. Scope should be specific if possible.`
                    },
                    { role: 'user', content: 'Extract knowledge.' },
                ],
                response_format: (0, zod_1.zodResponseFormat)(this.knowledgeSchema, 'knowledge_response'),
            });
            const content = completion.choices[0].message.content;
            if (!content)
                throw new Error('No content returned from OpenAI');
            return JSON.parse(content);
        }
        catch (e) {
            this.logger.error('Error in writeKnowledge', e);
            throw e;
        }
    }
    async createEmbedding(text) {
        const model = this.configService.get('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small');
        try {
            const response = await this.openai.embeddings.create({
                model,
                input: text,
            });
            return response.data[0].embedding;
        }
        catch (e) {
            this.logger.error('Error in createEmbedding', e);
            throw e;
        }
    }
    pickCandidateSchema = zod_2.z.object({
        vehicleId: zod_2.z.string().nullable(),
    });
    async pickCandidate(userText, candidates) {
        const model = this.configService.get('OPENAI_MODEL_UNDERSTAND', 'gpt-4o');
        const compact = candidates.map((c) => ({
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
                    content: `You must choose exactly one candidate vehicleId from the provided list or null.\n` +
                        `Never invent ids. If user text is insufficient, return null.`,
                },
                {
                    role: 'user',
                    content: `User said: ${userText}\nCandidates: ${JSON.stringify(compact)}`,
                },
            ],
            response_format: (0, zod_1.zodResponseFormat)(this.pickCandidateSchema, 'pick_candidate_response'),
        });
        const content = completion.choices[0].message.content;
        if (!content)
            return { vehicleId: null };
        return JSON.parse(content);
    }
};
exports.OpenAIClientService = OpenAIClientService;
exports.OpenAIClientService = OpenAIClientService = OpenAIClientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OpenAIClientService);
//# sourceMappingURL=openai-client.service.js.map