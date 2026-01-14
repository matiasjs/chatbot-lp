"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WhatsappController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const audit_service_1 = require("./services/audit.service");
const whatsapp_service_1 = require("./services/whatsapp.service");
let WhatsappController = WhatsappController_1 = class WhatsappController {
    configService;
    auditService;
    whatsappService;
    logger = new common_1.Logger(WhatsappController_1.name);
    constructor(configService, auditService, whatsappService) {
        this.configService = configService;
        this.auditService = auditService;
        this.whatsappService = whatsappService;
    }
    verifyWebhook(query, res) {
        const mode = query['hub.mode'];
        const token = query['hub.verify_token'];
        const challenge = query['hub.challenge'];
        const verifyToken = this.configService.get('WABA_VERIFY_TOKEN');
        if (mode && token) {
            if (mode === 'subscribe' && token === verifyToken) {
                this.logger.log('WEBHOOK_VERIFIED');
                return res.status(common_1.HttpStatus.OK).send(challenge);
            }
            else {
                this.logger.error('Verification failed. Tokens do not match.');
                return res.sendStatus(common_1.HttpStatus.FORBIDDEN);
            }
        }
        return res.sendStatus(common_1.HttpStatus.BAD_REQUEST);
    }
    async handleWebhook(body, res) {
        this.processWebhookPayload(body).catch(err => this.logger.error('Error processing webhook async', err));
        return res.status(common_1.HttpStatus.OK).send('EVENT_RECEIVED');
    }
    async handleDevWebhook(body, query, res) {
        const isDev = process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_ENDPOINTS === 'true';
        if (!isDev) {
            return res.sendStatus(common_1.HttpStatus.NOT_FOUND);
        }
        const sendToWaba = query.DEV_SEND_TO_WABA === 'true' || process.env.DEV_SEND_TO_WABA === 'true';
        const capturedMessages = [];
        const devProvider = {
            sendText: async (to, text) => {
                capturedMessages.push({ to, text, type: 'text' });
                if (sendToWaba) {
                    await this.whatsappService.sendText(to, text);
                }
            },
            downloadMedia: async (mediaId) => {
                return this.whatsappService.downloadMedia(mediaId);
            }
        };
        try {
            const processResults = await this.processWebhookPayload(body, devProvider);
            return res.status(common_1.HttpStatus.OK).json({
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
        }
        catch (err) {
            this.logger.error('Dev webhook error', err);
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
        }
    }
    async processWebhookPayload(body, customProvider = null) {
        const results = [];
        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry || []) {
                for (const change of entry.changes || []) {
                    const value = change.value;
                    if (value.messages && value.messages.length > 0) {
                        const message = value.messages[0];
                        const userId = message.from;
                        const dto = { userId };
                        if (message.type === 'text') {
                            dto.text = message.text.body;
                        }
                        else if (['image', 'document', 'audio', 'video'].includes(message.type)) {
                            const mediaObj = message[message.type];
                            dto.media = {
                                id: mediaObj.id,
                                mimeType: mediaObj.mime_type,
                                filename: mediaObj.filename
                            };
                        }
                        else {
                            this.logger.warn(`Unsupported message type: ${message.type}`);
                            results.push({ status: 'ignored', type: message.type });
                            continue;
                        }
                        try {
                            await this.auditService.handleIncomingMessage(dto, customProvider);
                            results.push({ status: 'processed', userId, dto });
                        }
                        catch (err) {
                            this.logger.error(`Error processing message from ${userId}`, err);
                            results.push({ status: 'error', error: err.message });
                        }
                    }
                }
            }
        }
        return results;
    }
};
exports.WhatsappController = WhatsappController;
__decorate([
    (0, common_1.Get)('webhooks/whatsapp'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], WhatsappController.prototype, "verifyWebhook", null);
__decorate([
    (0, common_1.Post)('webhooks/whatsapp'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WhatsappController.prototype, "handleWebhook", null);
__decorate([
    (0, common_1.Post)('dev/whatsapp/webhook'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], WhatsappController.prototype, "handleDevWebhook", null);
exports.WhatsappController = WhatsappController = WhatsappController_1 = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        audit_service_1.AuditService,
        whatsapp_service_1.WhatsappService])
], WhatsappController);
//# sourceMappingURL=whatsapp.controller.js.map