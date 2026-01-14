import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditService } from './services/audit.service';
import { WhatsappService } from './services/whatsapp.service';
import { WhatsappController } from './whatsapp.controller';

@Module({
    imports: [ConfigModule],
    controllers: [WhatsappController],
    providers: [WhatsappService, AuditService],
    exports: [WhatsappService],
})
export class WhatsappModule { }
