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
var WhatsappService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let WhatsappService = WhatsappService_1 = class WhatsappService {
    configService;
    logger = new common_1.Logger(WhatsappService_1.name);
    apiUrl;
    accessToken;
    phoneNumberId;
    constructor(configService) {
        this.configService = configService;
        const version = this.configService.get('WABA_GRAPH_VERSION', 'v18.0');
        this.accessToken = this.configService.get('WABA_ACCESS_TOKEN') || '';
        this.phoneNumberId = this.configService.get('WABA_PHONE_NUMBER_ID') || '';
        this.apiUrl = `https://graph.facebook.com/${version}`;
        if (!this.accessToken || !this.phoneNumberId) {
            this.logger.warn('WABA_ACCESS_TOKEN or WABA_PHONE_NUMBER_ID is missing. Real messages will fail.');
        }
    }
    async sendText(to, text) {
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
        }
        catch (error) {
            this.logger.error(`Failed to send text to ${to}`, error);
            throw error;
        }
    }
    async downloadMedia(mediaId) {
        try {
            const urlResponse = await fetch(`${this.apiUrl}/${mediaId}`, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` },
            });
            const urlData = await urlResponse.json();
            if (!urlResponse.ok || !urlData.url) {
                throw new Error(urlData.error?.message || 'Failed to get media URL');
            }
            const binaryResponse = await fetch(urlData.url, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` },
            });
            if (!binaryResponse.ok) {
                throw new Error('Failed to download media binary');
            }
            const arrayBuffer = await binaryResponse.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
        catch (error) {
            this.logger.error(`Failed to download media ${mediaId}`, error);
            throw error;
        }
    }
};
exports.WhatsappService = WhatsappService;
exports.WhatsappService = WhatsappService = WhatsappService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WhatsappService);
//# sourceMappingURL=whatsapp.service.js.map