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
export declare class ConversationOrchestratorService {
    private readonly conversations;
    private readonly openai;
    private readonly prisma;
    private readonly tickets;
    private readonly logger;
    constructor(conversations: ConversationsService, openai: OpenAIClientService, prisma: PrismaService, tickets: TicketsService);
    handleInbound(fromPhone: string, text: string): Promise<OrchestratorResult>;
    private findCandidatesFromDb;
    private replyFromVehicle;
    private chooseCandidateWithAI;
    private tokenize;
    private performEscalation;
}
export {};
