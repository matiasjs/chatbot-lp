import { Injectable, Logger } from '@nestjs/common';
import { OpenAIClientService } from '../openai/openai-client.service';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { ConversationsService } from './conversations.service';

type OrchestratorResult = {
    conversationId: string;
    action: 'REPLIED' | 'ASKED_CLARIFY' | 'ESCALATED' | 'ALREADY_ESCALATED' | 'UNKNOWN';
    replyText: string;
    ticketId?: string;
};

@Injectable()
export class ConversationOrchestratorService {
    private readonly logger = new Logger(ConversationOrchestratorService.name);

    constructor(
        private readonly conversations: ConversationsService,
        private readonly openai: OpenAIClientService,
        private readonly prisma: PrismaService,
        private readonly tickets: TicketsService,
    ) { }

    async handleInbound(fromPhone: string, text: string): Promise<OrchestratorResult> {
        const conversation = await this.conversations.findOrCreate(fromPhone);
        const lastDetected: any = conversation.lastDetected || null;

        // 1) Entender el mensaje con IA (entities + intent + next_action)
        const understanding = await this.openai.understandMessage(
            text,
            { state: conversation.state },
            lastDetected,
        );

        this.logger.log(`Understanding: ${JSON.stringify(understanding)}`);

        // 2) Si estamos en NEEDS_DATA con candidatos guardados, pedir a IA que elija candidato con el mensaje actual
        if (
            conversation.state === 'NEEDS_DATA' &&
            lastDetected?.candidates &&
            Array.isArray(lastDetected.candidates) &&
            lastDetected.candidates.length > 0
        ) {
            const chosen = await this.chooseCandidateWithAI(text, lastDetected.candidates);

            if (!chosen?.vehicleId) {
                return {
                    conversationId: conversation.id,
                    action: 'ASKED_CLARIFY',
                    replyText: 'No pude identificar la variante. Decime si es diésel o nafta, o pasame el código de motor (ej: 2KD-FTV).',
                };
            }

            const vehicle = await this.prisma.vehicle.findUnique({ where: { id: chosen.vehicleId } });
            if (!vehicle) {
                return await this.performEscalation(conversation, fromPhone, text, understanding.intent, null);
            }

            await this.conversations.updateState(conversation.id, 'NORMAL', { vehicleId: vehicle.id });
            return await this.replyFromVehicle(conversation.id, text, understanding.intent, vehicle);
        }

        // 3) Si IA pide aclaración directo
        if (understanding.next_action === 'ASK_CLARIFY') {
            const replyText = understanding.clarify_question || '¿Podés indicar año, versión y motor si lo sabés?';
            await this.conversations.updateState(conversation.id, 'NEEDS_DATA', { ...understanding.entities });
            return { conversationId: conversation.id, action: 'ASKED_CLARIFY', replyText };
        }

        // 4) Si IA sugiere escalar (o no hay señal), escalamos
        if (understanding.next_action === 'ESCALATE') {
            return await this.performEscalation(conversation, fromPhone, text, understanding.intent, lastDetected);
        }

        // 5) Buscar candidatos en BD usando entities (sin hardcode) + fallback por tokens del texto
        const candidates = await this.findCandidatesFromDb(text, understanding.entities);

        // 0 candidatos => escalar
        if (candidates.length === 0) {
            return await this.performEscalation(conversation, fromPhone, text, understanding.intent, understanding.entities);
        }

        // >1 candidatos => pedir aclaración (y guardar candidatos)
        if (candidates.length > 1) {
            const compact = candidates.slice(0, 5).map(v => ({
                vehicleId: v.id,
                brand: v.brand,
                model: v.model,
                versionText: v.versionText,
                engineName: v.engineName,
                engineTypeCode: v.engineTypeCode,
                fuel: v.fuel,
                powerPs: v.powerPs,
            }));

            await this.conversations.updateState(conversation.id, 'NEEDS_DATA', {
                entities: understanding.entities,
                candidates: compact,
            });

            // Armar opciones legibles
            const options = compact
                .slice(0, 3)
                .map(v => `${v.engineName ?? 'motor n/d'} (${v.fuel ?? 'n/d'}, ${v.engineTypeCode ?? 'n/d'})`)
                .join(' | ');

            return {
                conversationId: conversation.id,
                action: 'ASKED_CLARIFY',
                replyText: `Encontré varias variantes para ${compact[0].brand} ${compact[0].model}. ¿Cuál es?\n${options}\nRespondé por ejemplo: diesel, nafta o el código (ej: 2KD-FTV).`,
            };
        }

        // 1 candidato => responder
        const vehicle = candidates[0];
        await this.conversations.updateState(conversation.id, 'NORMAL', { vehicleId: vehicle.id });
        return await this.replyFromVehicle(conversation.id, text, understanding.intent, vehicle);
    }

    /**
     * Busca candidatos en BD usando:
     * - entidades (brand/model/engine/engine_code/fuel)
     * - y si faltan entidades, fallback por tokens del texto (contains)
     */
    private async findCandidatesFromDb(text: string, entities: any) {
        const tokens = this.tokenize(text);

        const brand = entities?.make?.trim() || null;  // tu IA lo llama make, en DB es brand
        const model = entities?.model?.trim() || null;
        const engine = entities?.engine?.trim() || null; // puede venir "2.4" o "2.4 D-4D"
        const engineCode = entities?.engine_code?.trim() || null;
        const fuel = entities?.fuel?.trim?.() || null; // si luego lo agregás al schema IA

        // 1) Query “fuerte” si tenemos brand+model
        if (brand && model) {
            return await this.prisma.vehicle.findMany({
                where: {
                    AND: [
                        { brand: { equals: brand, mode: 'insensitive' as const } },
                        { model: { equals: model, mode: 'insensitive' as const } },
                        ...(engine ? [{ engineName: { contains: engine, mode: 'insensitive' as const } }] : []),
                        ...(engineCode ? [{ engineTypeCode: { equals: engineCode, mode: 'insensitive' as const } }] : []),
                        ...(fuel ? [{ fuel: { equals: fuel, mode: 'insensitive' as const } }] : []),
                    ],
                },
                take: 10,
            });
        }

        // 2) Fallback: tokens contra brand/model/engineName sin hardcode
        // Construimos OR grande: si el texto contiene “hilux”, matchea en model.
        const orClauses = tokens.flatMap(t => ([
            { brand: { contains: t, mode: 'insensitive' as const } },
            { model: { contains: t, mode: 'insensitive' as const } },
            { engineName: { contains: t, mode: 'insensitive' as const } },
            { engineTypeCode: { contains: t, mode: 'insensitive' as const } },
        ]));

        // Si no hay tokens útiles, devolvemos vacío
        if (orClauses.length === 0) return [];

        return await this.prisma.vehicle.findMany({
            where: { OR: orClauses },
            take: 10,
        });
    }

    /**
     * Cuando ya tenés un vehicle elegido, respondé con datos de BD.
     * - ENGINE_SPEC: motor
     * - CHIP_TUNING/COMPATIBILITY: intenta sumar ECU + connection modes desde offers
     * - Si no hay offers y la pregunta requiere eso: escalar
     */
    private async replyFromVehicle(conversationId: string, questionText: string, intent: string, vehicle: any): Promise<OrchestratorResult> {
        // motor directo
        if (intent === 'ENGINE_SPEC') {
            const fuel = vehicle.fuel ? `, ${vehicle.fuel}` : '';
            const power = vehicle.powerPs ? `, ${vehicle.powerPs} PS` : '';
            const replyText = `${vehicle.brand} ${vehicle.model}: motor ${vehicle.engineName ?? 'no especificado'} (${vehicle.engineTypeCode ?? 'código n/d'})${fuel}${power}.`;
            return { conversationId, action: 'REPLIED', replyText };
        }

        // Para ECU / chipeo, intentamos offers
        const offers = await this.prisma.vehicleEcuOffer.findMany({
            where: { vehicleId: vehicle.id },
            include: { ecu: true },
            take: 3,
        });

        const needsOffer = intent === 'CHIP_TUNING' || intent === 'COMPATIBILITY';
        if (needsOffer && offers.length === 0) {
            return {
                conversationId,
                action: 'ESCALATED',
                replyText: 'No tengo la información de ECU/conexión para esa variante. Lo consulto con un especialista y te respondo por acá.',
            };
        }

        if (offers.length > 0) {
            const o = offers[0];
            const ecuText = o.ecu ? `${o.ecu.maker ?? ''} ${o.ecu.ecuModel ?? ''}`.trim() : 'ECU no especificada';
            const modes = (o.connectionModes || []).join(', ');
            const price = o.priceText ? ` Precio: ${o.priceText}.` : '';

            if (intent === 'CHIP_TUNING') {
                const replyText =
                    `${vehicle.brand} ${vehicle.model}: ${vehicle.engineName ?? 'motor n/d'} (${vehicle.engineTypeCode ?? 'n/d'}). ` +
                    `ECU: ${ecuText}. Modo: ${modes || 'n/d'}.` +
                    `${price} ` +
                    `Sobre repro/chipeo: depende del estado del motor, combustible, mapa y normativa local. Si querés lo confirmo para tu caso.`;
                return { conversationId, action: 'REPLIED', replyText };
            }

            const replyText =
                `${vehicle.brand} ${vehicle.model}: ${vehicle.engineName ?? 'motor n/d'} (${vehicle.engineTypeCode ?? 'n/d'}). ` +
                `ECU: ${ecuText}. Modo: ${modes || 'n/d'}.` +
                `${price}`;
            return { conversationId, action: 'REPLIED', replyText };
        }

        // Intent no contemplado => escalar
        return {
            conversationId,
            action: 'ESCALATED',
            replyText: 'No lo tengo confirmado en mi base. Lo consulto con un especialista y te respondo por acá.',
        };
    }

    /**
     * IA elige candidato cuando hay múltiples opciones.
     * No inventa: solo puede devolver vehicleId que esté en la lista.
     */
    private async chooseCandidateWithAI(userText: string, candidates: any[]): Promise<{ vehicleId: string | null }> {
        // Reutilizamos OpenAIClientService con un “mini prompt” usando composeAnswer u otro método.
        // Para no tocar tu OpenAIClientService ahora, hacemos un truco: llamamos composeAnswer con un schema simple.
        // Si preferís, te doy una función dedicada en OpenAIClientService.

        // Implementación sin tocar OpenAIClientService:
        // 1) Si el usuario escribió un engine code explícito, elegimos por match y evitamos IA
        const codeMatch = userText.match(/\b[0-9][A-Z]{2,}-[A-Z0-9]{2,}\b/i); // ej 2KD-FTV, 1GD-FTV
        if (codeMatch) {
            const code = codeMatch[0].toUpperCase();
            const found = candidates.find(c => (c.engineTypeCode || '').toUpperCase() === code);
            if (found?.vehicleId) return { vehicleId: found.vehicleId };
        }

        // 2) Si el usuario dice diesel/nafta, filtrar por fuel
        const lower = userText.toLowerCase();
        if (lower.includes('diesel') || lower.includes('diésel')) {
            const found = candidates.find(c => (c.fuel || '').toLowerCase().includes('diesel'));
            if (found?.vehicleId) return { vehicleId: found.vehicleId };
        }
        if (lower.includes('nafta') || lower.includes('petrol') || lower.includes('gasolina')) {
            const found = candidates.find(c => {
                const f = (c.fuel || '').toLowerCase();
                return f.includes('petrol') || f.includes('gasoline') || f.includes('nafta');
            });
            if (found?.vehicleId) return { vehicleId: found.vehicleId };
        }

        // 3) Si nada obvio, usamos IA con “elección forzada”:
        // Como no quiero que invente, le pasamos lista y le pedimos SOLO vehicleId o null.
        // Para esto sí conviene agregar un método en OpenAIClientService, pero lo dejo acá directo con prisma no.
        // Si no hay OpenAI, devolvemos null y re-preguntamos.
        try {
            const result = await this.openai.pickCandidate(userText, candidates);
            return { vehicleId: result?.vehicleId ?? null };
        } catch {
            return { vehicleId: null };
        }
    }

    private tokenize(text: string): string[] {
        const lower = (text || '').toLowerCase();
        return lower
            .replace(/[^\p{L}\p{N}\s.]/gu, ' ')
            .split(/\s+/)
            .map(t => t.trim())
            .filter(t => t.length >= 3);
    }

    private async performEscalation(conversation: any, userPhone: string, text: string, intent: string, context: any): Promise<OrchestratorResult> {
        if (conversation.state === 'ESCALATED') {
            return {
                conversationId: conversation.id,
                action: 'ALREADY_ESCALATED',
                replyText: 'Ya lo derivé a un especialista. Te respondo apenas lo tenga.',
            };
        }

        await this.conversations.updateState(conversation.id, 'ESCALATED', context);

        const ticket = await this.tickets.create({
            conversationId: conversation.id,
            userPhone: userPhone,
            expertPhone: process.env.EXPERT_PHONE_DEFAULT || '5491100000000',
            questionRaw: text,
            detectedCarId: context?.vehicleId || undefined,
        });

        return {
            conversationId: conversation.id,
            action: 'ESCALATED',
            replyText: 'No lo tengo confirmado en mi base. Lo consulto con un especialista y te respondo por acá.',
            ticketId: ticket.id,
        };
    }
}
