import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAIClientService } from './openai-client.service';

@Module({
    imports: [ConfigModule],
    providers: [OpenAIClientService],
    exports: [OpenAIClientService],
})
export class OpenAIModule { }
