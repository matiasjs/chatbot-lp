import { ConfigService } from '@nestjs/config';
export declare class WhatsappService {
    private configService;
    private readonly logger;
    private readonly apiUrl;
    private readonly accessToken;
    private readonly phoneNumberId;
    constructor(configService: ConfigService);
    sendText(to: string, text: string): Promise<any>;
    downloadMedia(mediaId: string): Promise<Buffer>;
}
