import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class OpenAIClientService implements OnModuleInit {
    private configService;
    private openai;
    private readonly logger;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    private understandingSchema;
    private composerSchema;
    private knowledgeSchema;
    understandMessage(text: string, context: any, carCandidate?: any): Promise<any>;
    private fallbackUnderstanding;
    composeAnswer(question: string, carInfo: any, qaEntries: any[], notes: string): Promise<any>;
    writeKnowledge(ticketData: any, expertAnswer: string, detectedCar: any): Promise<any>;
    createEmbedding(text: string): Promise<number[]>;
    private pickCandidateSchema;
    pickCandidate(userText: string, candidates: any[]): Promise<any>;
}
