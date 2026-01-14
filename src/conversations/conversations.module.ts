import { Module } from '@nestjs/common';
import { CarsModule } from '../cars/cars.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { OpenAIModule } from '../openai/openai.module';
import { TicketsModule } from '../tickets/tickets.module';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { ConversationsService } from './conversations.service';

@Module({
    imports: [OpenAIModule, CarsModule, KnowledgeModule, TicketsModule],
    providers: [ConversationsService, ConversationOrchestratorService],
    exports: [ConversationsService, ConversationOrchestratorService],
})
export class ConversationsModule { }
