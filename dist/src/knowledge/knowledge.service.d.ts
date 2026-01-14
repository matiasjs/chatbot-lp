import { ConfigService } from '@nestjs/config';
import { OpenAIClientService } from '../openai/openai-client.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class KnowledgeService {
    private prisma;
    private openai;
    private config;
    constructor(prisma: PrismaService, openai: OpenAIClientService, config: ConfigService);
    findRelevant(text: string, scopeType?: string, scopeId?: string): Promise<{
        vector: any[];
        exact: {
            intent: string;
            id: string;
            answer: string;
            tags: string[];
            status: string;
            scopeType: string;
            scopeId: string | null;
            questionCanonical: string;
            createdBy: string;
            sourceTicketId: string | null;
            version: number;
            replacedBy: string | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
    }>;
    create(data: any): Promise<{
        intent: string;
        id: string;
        answer: string;
        tags: string[];
        status: string;
        scopeType: string;
        scopeId: string | null;
        questionCanonical: string;
        createdBy: string;
        sourceTicketId: string | null;
        version: number;
        replacedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    upsertVerification(knowledgeDto: any): Promise<{
        id: `${string}-${string}-${string}-${string}-${string}`;
    }>;
}
