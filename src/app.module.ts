import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CarsModule } from './cars/cars.module';
import { ChannelsModule } from './channels/channels.module';
import { ConversationsModule } from './conversations/conversations.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { OpenAIModule } from './openai/openai.module';
import { PrismaModule } from './prisma/prisma.module';
import { TicketsModule } from './tickets/tickets.module';
import { OffersModule } from './vehicles/offers.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    OpenAIModule,
    ChannelsModule,
    ConversationsModule,
    CarsModule,
    KnowledgeModule,
    TicketsModule,
    VehiclesModule,
    OffersModule,
    WhatsappModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
