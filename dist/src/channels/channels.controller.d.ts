import { ConversationOrchestratorService } from '../conversations/conversation-orchestrator.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class ChannelsController {
    private prisma;
    private orchestrator;
    constructor(prisma: PrismaService, orchestrator: ConversationOrchestratorService);
    inbound(body: {
        fromPhone: string;
        text: string;
        messageId?: string;
    }): Promise<{
        conversationId: string;
        action: "REPLIED" | "ASKED_CLARIFY" | "ESCALATED" | "ALREADY_ESCALATED" | "UNKNOWN";
        replyText: string;
        ticketId?: string;
    }>;
    pollReplies(body: {
        forPhone: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        text: string;
        status: string;
        toPhone: string;
        channel: string;
        relatedTicketId: string | null;
        relatedConversationId: string | null;
    }[]>;
}
export declare class OutboundController {
    private prisma;
    constructor(prisma: PrismaService);
    getPending(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        text: string;
        status: string;
        toPhone: string;
        channel: string;
        relatedTicketId: string | null;
        relatedConversationId: string | null;
    }[]>;
    markSent(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        text: string;
        status: string;
        toPhone: string;
        channel: string;
        relatedTicketId: string | null;
        relatedConversationId: string | null;
    }>;
}
