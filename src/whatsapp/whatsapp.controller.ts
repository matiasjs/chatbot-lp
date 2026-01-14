import { Body, Controller, Get, HttpStatus, Logger, Post, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { WhatsappMessageDto } from './dto/whatsapp-message.dto';
import { AuditService } from './services/audit.service';
import { WhatsappService } from './services/whatsapp.service';

@Controller()
export class WhatsappController {
    private readonly logger = new Logger(WhatsappController.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly auditService: AuditService,
        private readonly whatsappService: WhatsappService,
    ) { }

    @Get('webhooks/whatsapp')
    verifyWebhook(@Query() query: any, @Res() res: Response) {
        const mode = query['hub.mode'];
        const token = query['hub.verify_token'];
        const challenge = query['hub.challenge'];
        const verifyToken = this.configService.get<string>('WABA_VERIFY_TOKEN');

        if (mode && token) {
            if (mode === 'subscribe' && token === verifyToken) {
                this.logger.log('WEBHOOK_VERIFIED');
                return res.status(HttpStatus.OK).send(challenge);
            } else {
                this.logger.error('Verification failed. Tokens do not match.');
                return res.sendStatus(HttpStatus.FORBIDDEN);
            }
        }
        return res.sendStatus(HttpStatus.BAD_REQUEST);
    }

    @Post('webhooks/whatsapp')
    async handleWebhook(@Body() body: any, @Res() res: Response) {
        // Fire and forget processing to return 200 OK quickly to WhatsApp
        this.processWebhookPayload(body).catch(err =>
            this.logger.error('Error processing webhook async', err)
        );
        return res.status(HttpStatus.OK).send('EVENT_RECEIVED');
    }

    @Post('dev/whatsapp/webhook')
    async handleDevWebhook(@Body() body: any, @Query() query: any, @Res() res: Response) {
        const isDev = process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_ENDPOINTS === 'true';
        if (!isDev) {
            return res.sendStatus(HttpStatus.NOT_FOUND);
        }

        const sendToWaba = query.DEV_SEND_TO_WABA === 'true' || process.env.DEV_SEND_TO_WABA === 'true';
        const capturedMessages: any[] = [];

        // Mock Provider
        const devProvider = {
            sendText: async (to: string, text: string) => {
                capturedMessages.push({ to, text, type: 'text' });
                if (sendToWaba) {
                    await this.whatsappService.sendText(to, text);
                }
            },
            downloadMedia: async (mediaId: string) => {
                // In dev mode, if we want to test CSVs without real media IDs, we can mock it.
                // But logic allows fallback to real service if mediaId looks real.
                return this.whatsappService.downloadMedia(mediaId);
            }
        };

        try {
            const processResults = await this.processWebhookPayload(body, devProvider);
            return res.status(HttpStatus.OK).json({
                meta: {
                    env: process.env.NODE_ENV,
                    mode: 'dev_simulation',
                    sendToWaba
                },
                input: {
                    messagesCount: processResults.length
                },
                output: {
                    capturedMessages
                },
                processLogs: processResults
            });
        } catch (err) {
            this.logger.error('Dev webhook error', err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
        }
    }

    private async processWebhookPayload(body: any, customProvider: any = null) {
        const results = [];
        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry || []) {
                for (const change of entry.changes || []) {
                    const value = change.value;
                    if (value.messages && value.messages.length > 0) {
                        const message = value.messages[0];
                        const userId = message.from; // Phone number

                        const dto: WhatsappMessageDto = { userId };

                        if (message.type === 'text') {
                            dto.text = message.text.body;
                        } else if (['image', 'document', 'audio', 'video'].includes(message.type)) {
                            const mediaObj = message[message.type];
                            dto.media = {
                                id: mediaObj.id,
                                mimeType: mediaObj.mime_type,
                                filename: mediaObj.filename
                            };
                        } else {
                            this.logger.warn(`Unsupported message type: ${message.type}`);
                            results.push({ status: 'ignored', type: message.type });
                            continue;
                        }

                        try {
                            await this.auditService.handleIncomingMessage(dto, customProvider);
                            results.push({ status: 'processed', userId, dto });
                        } catch (err) {
                            this.logger.error(`Error processing message from ${userId}`, err);
                            results.push({ status: 'error', error: err.message });
                        }
                    }
                }
            }
        }
        return results;
    }
}
