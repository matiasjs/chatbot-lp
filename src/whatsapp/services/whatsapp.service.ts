import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappService {
    private readonly logger = new Logger(WhatsappService.name);
    private readonly apiUrl: string;
    private readonly accessToken: string;
    private readonly phoneNumberId: string;

    constructor(private configService: ConfigService) {
        const version = this.configService.get<string>('WABA_GRAPH_VERSION', 'v18.0');
        this.accessToken = this.configService.get<string>('WABA_ACCESS_TOKEN') || '';
        this.phoneNumberId = this.configService.get<string>('WABA_PHONE_NUMBER_ID') || '';
        this.apiUrl = `https://graph.facebook.com/${version}`;

        if (!this.accessToken || !this.phoneNumberId) {
            this.logger.warn('WABA_ACCESS_TOKEN or WABA_PHONE_NUMBER_ID is missing. Real messages will fail.');
        }
    }

    async sendText(to: string, text: string): Promise<any> {
        const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
        const body = {
            messaging_product: 'whatsapp',
            to: to,
            type: 'text',
            text: { body: text },
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();
            if (!response.ok) {
                this.logger.error(`Error sending message: ${JSON.stringify(data)}`);
                throw new Error(data.error?.message || 'Failed to send message');
            }
            return data;
        } catch (error) {
            this.logger.error(`Failed to send text to ${to}`, error);
            throw error;
        }
    }

    async downloadMedia(mediaId: string): Promise<Buffer> {
        try {
            // 1. Get Media URL
            const urlResponse = await fetch(`${this.apiUrl}/${mediaId}`, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` },
            });
            const urlData = await urlResponse.json();

            if (!urlResponse.ok || !urlData.url) {
                throw new Error(urlData.error?.message || 'Failed to get media URL');
            }

            // 2. Download valid binary
            const binaryResponse = await fetch(urlData.url, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` },
            });

            if (!binaryResponse.ok) {
                throw new Error('Failed to download media binary');
            }

            const arrayBuffer = await binaryResponse.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (error) {
            this.logger.error(`Failed to download media ${mediaId}`, error);
            throw error;
        }
    }
}
