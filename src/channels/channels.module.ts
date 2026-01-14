import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { ChannelsController, OutboundController } from './channels.controller';

@Module({
    imports: [ConversationsModule],
    controllers: [ChannelsController, OutboundController],
})
export class ChannelsModule { }
