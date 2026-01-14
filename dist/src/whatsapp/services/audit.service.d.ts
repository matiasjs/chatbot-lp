import { WhatsappMessageDto } from '../dto/whatsapp-message.dto';
import { WhatsappService } from './whatsapp.service';
export declare class AuditService {
    private whatsappService;
    private readonly logger;
    private sessionStore;
    constructor(whatsappService: WhatsappService);
    handleIncomingMessage(dto: WhatsappMessageDto, customProvider?: any): Promise<any>;
    private handleStart;
    private handleReset;
    private handleRun;
    private handleMedia;
    private getSession;
    private updateSession;
    private looksLikeCsv;
    private chunkString;
    private callLLM;
}
