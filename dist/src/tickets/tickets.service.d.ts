import { KnowledgeService } from '../knowledge/knowledge.service';
import { OpenAIClientService } from '../openai/openai-client.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class TicketsService {
    private prisma;
    private openai;
    private knowledge;
    constructor(prisma: PrismaService, openai: OpenAIClientService, knowledge: KnowledgeService);
    create(ticketData: {
        conversationId: string;
        userPhone: string;
        expertPhone: string;
        questionRaw: string;
        detectedCarId?: string;
    }): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        userPhone: string;
        expertPhone: string;
        questionRaw: string;
        expertAnswerRaw: string | null;
        finalAnswerSent: string | null;
        conversationId: string;
        detectedCarId: string | null;
    }>;
    resolve(ticketId: string, expertPhone: string, answerText: string): Promise<{
        success: boolean;
        knowledge: any;
    }>;
}
