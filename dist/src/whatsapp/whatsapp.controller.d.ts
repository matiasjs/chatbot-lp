import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuditService } from './services/audit.service';
import { WhatsappService } from './services/whatsapp.service';
export declare class WhatsappController {
    private readonly configService;
    private readonly auditService;
    private readonly whatsappService;
    private readonly logger;
    constructor(configService: ConfigService, auditService: AuditService, whatsappService: WhatsappService);
    verifyWebhook(query: any, res: Response): Response<any, Record<string, any>>;
    handleWebhook(body: any, res: Response): Promise<Response<any, Record<string, any>>>;
    handleDevWebhook(body: any, query: any, res: Response): Promise<Response<any, Record<string, any>>>;
    private processWebhookPayload;
}
