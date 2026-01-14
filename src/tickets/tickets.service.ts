import { Injectable } from '@nestjs/common';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { OpenAIClientService } from '../openai/openai-client.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketsService {
    constructor(
        private prisma: PrismaService,
        private openai: OpenAIClientService,
        private knowledge: KnowledgeService
    ) { }

    async create(ticketData: { conversationId: string; userPhone: string; expertPhone: string; questionRaw: string; detectedCarId?: string }) {
        // 1. Create Ticket
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

        // 2. Create Outbound Message for Expert
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

    async resolve(ticketId: string, expertPhone: string, answerText: string) {
        // 1. Verify ticket exists and is open
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: { detectedCar: true }
        });

        if (!ticket) throw new Error('Ticket not found');
        if (ticket.status !== 'OPEN') throw new Error('Ticket already resolved or closed');

        // 2. Write Knowledge (AI)
        const knowledgeEntry = await this.openai.writeKnowledge(ticket, answerText, ticket.detectedCar);

        // 3. Persist Knowledge
        await this.knowledge.upsertVerification(knowledgeEntry);

        // 4. Update Ticket
        await this.prisma.ticket.update({
            where: { id: ticketId },
            data: {
                status: 'ANSWERED',
                expertAnswerRaw: answerText,
                finalAnswerSent: knowledgeEntry.answer
            }
        });

        // 5. Notify User
        await this.prisma.outboundMessage.create({
            data: {
                toPhone: ticket.userPhone,
                channel: 'USER_WHATSAPP',
                text: knowledgeEntry.answer, // Or a composed version
                relatedTicketId: ticket.id,
                relatedConversationId: ticket.conversationId,
                status: 'PENDING'
            }
        });

        return { success: true, knowledge: knowledgeEntry };
    }
}
