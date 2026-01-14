import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAIModule } from '../openai/openai.module';
import { KnowledgeController } from './knowledge.controller'; // Ensure this file exists and is correct name
import { KnowledgeService } from './knowledge.service';

@Module({
    imports: [OpenAIModule, ConfigModule],
    controllers: [KnowledgeController],
    providers: [KnowledgeService],
    exports: [KnowledgeService],
})
export class KnowledgeModule { }
