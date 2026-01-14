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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboundController = exports.ChannelsController = void 0;
const common_1 = require("@nestjs/common");
const conversation_orchestrator_service_1 = require("../conversations/conversation-orchestrator.service");
const prisma_service_1 = require("../prisma/prisma.service");
let ChannelsController = class ChannelsController {
    prisma;
    orchestrator;
    constructor(prisma, orchestrator) {
        this.prisma = prisma;
        this.orchestrator = orchestrator;
    }
    async inbound(body) {
        return this.orchestrator.handleInbound(body.fromPhone, body.text);
    }
    async pollReplies(body) {
        return this.prisma.outboundMessage.findMany({
            where: { toPhone: body.forPhone, status: 'PENDING', channel: 'USER_WHATSAPP' }
        });
    }
};
exports.ChannelsController = ChannelsController;
__decorate([
    (0, common_1.Post)('inbound'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChannelsController.prototype, "inbound", null);
__decorate([
    (0, common_1.Post)('poll-replies'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChannelsController.prototype, "pollReplies", null);
exports.ChannelsController = ChannelsController = __decorate([
    (0, common_1.Controller)('channels/whatsapp'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        conversation_orchestrator_service_1.ConversationOrchestratorService])
], ChannelsController);
let OutboundController = class OutboundController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPending() {
        return this.prisma.outboundMessage.findMany({
            where: { status: 'PENDING' }
        });
    }
    async markSent(id) {
        return this.prisma.outboundMessage.update({
            where: { id },
            data: { status: 'SENT' }
        });
    }
};
exports.OutboundController = OutboundController;
__decorate([
    (0, common_1.Get)('pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OutboundController.prototype, "getPending", null);
__decorate([
    (0, common_1.Post)(':id/mark-sent'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OutboundController.prototype, "markSent", null);
exports.OutboundController = OutboundController = __decorate([
    (0, common_1.Controller)('outbound'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OutboundController);
//# sourceMappingURL=channels.controller.js.map