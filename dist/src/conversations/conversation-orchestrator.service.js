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
var ConversationOrchestratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationOrchestratorService = void 0;
const common_1 = require("@nestjs/common");
const openai_client_service_1 = require("../openai/openai-client.service");
const prisma_service_1 = require("../prisma/prisma.service");
const tickets_service_1 = require("../tickets/tickets.service");
const conversations_service_1 = require("./conversations.service");
let ConversationOrchestratorService = ConversationOrchestratorService_1 = class ConversationOrchestratorService {
    conversations;
    openai;
    prisma;
    tickets;
    logger = new common_1.Logger(ConversationOrchestratorService_1.name);
    constructor(conversations, openai, prisma, tickets) {
        this.conversations = conversations;
        this.openai = openai;
        this.prisma = prisma;
        this.tickets = tickets;
    }
    async handleInbound(fromPhone, text) {
        const conversation = await this.conversations.findOrCreate(fromPhone);
        const lastDetected = conversation.lastDetected || null;
        const understanding = await this.openai.understandMessage(text, { state: conversation.state }, lastDetected);
        this.logger.log(`Understanding: ${JSON.stringify(understanding)}`);
        if (conversation.state === 'NEEDS_DATA' &&
            lastDetected?.candidates &&
            Array.isArray(lastDetected.candidates) &&
            lastDetected.candidates.length > 0) {
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
        if (understanding.next_action === 'ASK_CLARIFY') {
            const replyText = understanding.clarify_question || '¿Podés indicar año, versión y motor si lo sabés?';
            await this.conversations.updateState(conversation.id, 'NEEDS_DATA', { ...understanding.entities });
            return { conversationId: conversation.id, action: 'ASKED_CLARIFY', replyText };
        }
        if (understanding.next_action === 'ESCALATE') {
            return await this.performEscalation(conversation, fromPhone, text, understanding.intent, lastDetected);
        }
        const candidates = await this.findCandidatesFromDb(text, understanding.entities);
        if (candidates.length === 0) {
            return await this.performEscalation(conversation, fromPhone, text, understanding.intent, understanding.entities);
        }
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
        const vehicle = candidates[0];
        await this.conversations.updateState(conversation.id, 'NORMAL', { vehicleId: vehicle.id });
        return await this.replyFromVehicle(conversation.id, text, understanding.intent, vehicle);
    }
    async findCandidatesFromDb(text, entities) {
        const tokens = this.tokenize(text);
        const brand = entities?.make?.trim() || null;
        const model = entities?.model?.trim() || null;
        const engine = entities?.engine?.trim() || null;
        const engineCode = entities?.engine_code?.trim() || null;
        const fuel = entities?.fuel?.trim?.() || null;
        if (brand && model) {
            return await this.prisma.vehicle.findMany({
                where: {
                    AND: [
                        { brand: { equals: brand, mode: 'insensitive' } },
                        { model: { equals: model, mode: 'insensitive' } },
                        ...(engine ? [{ engineName: { contains: engine, mode: 'insensitive' } }] : []),
                        ...(engineCode ? [{ engineTypeCode: { equals: engineCode, mode: 'insensitive' } }] : []),
                        ...(fuel ? [{ fuel: { equals: fuel, mode: 'insensitive' } }] : []),
                    ],
                },
                take: 10,
            });
        }
        const orClauses = tokens.flatMap(t => ([
            { brand: { contains: t, mode: 'insensitive' } },
            { model: { contains: t, mode: 'insensitive' } },
            { engineName: { contains: t, mode: 'insensitive' } },
            { engineTypeCode: { contains: t, mode: 'insensitive' } },
        ]));
        if (orClauses.length === 0)
            return [];
        return await this.prisma.vehicle.findMany({
            where: { OR: orClauses },
            take: 10,
        });
    }
    async replyFromVehicle(conversationId, questionText, intent, vehicle) {
        if (intent === 'ENGINE_SPEC') {
            const fuel = vehicle.fuel ? `, ${vehicle.fuel}` : '';
            const power = vehicle.powerPs ? `, ${vehicle.powerPs} PS` : '';
            const replyText = `${vehicle.brand} ${vehicle.model}: motor ${vehicle.engineName ?? 'no especificado'} (${vehicle.engineTypeCode ?? 'código n/d'})${fuel}${power}.`;
            return { conversationId, action: 'REPLIED', replyText };
        }
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
                const replyText = `${vehicle.brand} ${vehicle.model}: ${vehicle.engineName ?? 'motor n/d'} (${vehicle.engineTypeCode ?? 'n/d'}). ` +
                    `ECU: ${ecuText}. Modo: ${modes || 'n/d'}.` +
                    `${price} ` +
                    `Sobre repro/chipeo: depende del estado del motor, combustible, mapa y normativa local. Si querés lo confirmo para tu caso.`;
                return { conversationId, action: 'REPLIED', replyText };
            }
            const replyText = `${vehicle.brand} ${vehicle.model}: ${vehicle.engineName ?? 'motor n/d'} (${vehicle.engineTypeCode ?? 'n/d'}). ` +
                `ECU: ${ecuText}. Modo: ${modes || 'n/d'}.` +
                `${price}`;
            return { conversationId, action: 'REPLIED', replyText };
        }
        return {
            conversationId,
            action: 'ESCALATED',
            replyText: 'No lo tengo confirmado en mi base. Lo consulto con un especialista y te respondo por acá.',
        };
    }
    async chooseCandidateWithAI(userText, candidates) {
        const codeMatch = userText.match(/\b[0-9][A-Z]{2,}-[A-Z0-9]{2,}\b/i);
        if (codeMatch) {
            const code = codeMatch[0].toUpperCase();
            const found = candidates.find(c => (c.engineTypeCode || '').toUpperCase() === code);
            if (found?.vehicleId)
                return { vehicleId: found.vehicleId };
        }
        const lower = userText.toLowerCase();
        if (lower.includes('diesel') || lower.includes('diésel')) {
            const found = candidates.find(c => (c.fuel || '').toLowerCase().includes('diesel'));
            if (found?.vehicleId)
                return { vehicleId: found.vehicleId };
        }
        if (lower.includes('nafta') || lower.includes('petrol') || lower.includes('gasolina')) {
            const found = candidates.find(c => {
                const f = (c.fuel || '').toLowerCase();
                return f.includes('petrol') || f.includes('gasoline') || f.includes('nafta');
            });
            if (found?.vehicleId)
                return { vehicleId: found.vehicleId };
        }
        try {
            const result = await this.openai.pickCandidate(userText, candidates);
            return { vehicleId: result?.vehicleId ?? null };
        }
        catch {
            return { vehicleId: null };
        }
    }
    tokenize(text) {
        const lower = (text || '').toLowerCase();
        return lower
            .replace(/[^\p{L}\p{N}\s.]/gu, ' ')
            .split(/\s+/)
            .map(t => t.trim())
            .filter(t => t.length >= 3);
    }
    async performEscalation(conversation, userPhone, text, intent, context) {
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
};
exports.ConversationOrchestratorService = ConversationOrchestratorService;
exports.ConversationOrchestratorService = ConversationOrchestratorService = ConversationOrchestratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [conversations_service_1.ConversationsService,
        openai_client_service_1.OpenAIClientService,
        prisma_service_1.PrismaService,
        tickets_service_1.TicketsService])
], ConversationOrchestratorService);
//# sourceMappingURL=conversation-orchestrator.service.js.map