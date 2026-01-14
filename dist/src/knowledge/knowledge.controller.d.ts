import { KnowledgeService } from './knowledge.service';
export declare class KnowledgeController {
    private readonly knowledgeService;
    constructor(knowledgeService: KnowledgeService);
    search(q: string): Promise<{
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
    create(body: any): Promise<{
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
}
