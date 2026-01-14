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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketsService = void 0;
const common_1 = require("@nestjs/common");
const knowledge_service_1 = require("../knowledge/knowledge.service");
const openai_client_service_1 = require("../openai/openai-client.service");
const prisma_service_1 = require("../prisma/prisma.service");
let TicketsService = class TicketsService {
    prisma;
    openai;
    knowledge;
    constructor(prisma, openai, knowledge) {
        this.prisma = prisma;
        this.openai = openai;
        this.knowledge = knowledge;
    }
    async create(ticketData) {
        const ticket = await this.prisma.ticket.create({
            data: {
                conversationId: ticketData.conversationId,
                userPhone: ticketData.userPhone,
                expertPhone: ticketData.expertPhone,
                questionRaw: ticketData.questionRaw,
                detectedCarId: ticketData.detectedCarId,
                status: 'OPEN',
            }
        });
        await this.prisma.outboundMessage.create({
            data: {
                toPhone: ticketData.expertPhone,
                channel: 'EXPERT_WHATSAPP',
                text: `[TICKET #${ticket.id.slice(0, 8)}] New question from ${ticketData.userPhone}:\n"${ticketData.questionRaw}"\n\nReply to this message to answer.`,
                relatedTicketId: ticket.id,
                status: 'PENDING'
            }
        });
        return ticket;
    }
    async resolve(ticketId, expertPhone, answerText) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: { detectedCar: true }
        });
        if (!ticket)
            throw new Error('Ticket not found');
        if (ticket.status !== 'OPEN')
            throw new Error('Ticket already resolved or closed');
        const knowledgeEntry = await this.openai.writeKnowledge(ticket, answerText, ticket.detectedCar);
        await this.knowledge.upsertVerification(knowledgeEntry);
        await this.prisma.ticket.update({
            where: { id: ticketId },
            data: {
                status: 'ANSWERED',
                expertAnswerRaw: answerText,
                finalAnswerSent: knowledgeEntry.answer
            }
        });
        await this.prisma.outboundMessage.create({
            data: {
                toPhone: ticket.userPhone,
                channel: 'USER_WHATSAPP',
                text: knowledgeEntry.answer,
                relatedTicketId: ticket.id,
                relatedConversationId: ticket.conversationId,
                status: 'PENDING'
            }
        });
        return { success: true, knowledge: knowledgeEntry };
    }
};
exports.TicketsService = TicketsService;
exports.TicketsService = TicketsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        openai_client_service_1.OpenAIClientService,
        knowledge_service_1.KnowledgeService])
], TicketsService);
//# sourceMappingURL=tickets.service.js.map