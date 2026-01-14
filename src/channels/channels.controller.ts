import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ConversationOrchestratorService } from '../conversations/conversation-orchestrator.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('channels/whatsapp')
export class ChannelsController {
    constructor(
        private prisma: PrismaService,
        private orchestrator: ConversationOrchestratorService
    ) { }

    @Post('inbound')
    async inbound(@Body() body: { fromPhone: string; text: string; messageId?: string }) {
        return this.orchestrator.handleInbound(body.fromPhone, body.text);
    }

    // Simulation endpoints
    @Post('poll-replies')
    async pollReplies(@Body() body: { forPhone: string }) {
        // Just returns pending messages for a user
        return this.prisma.outboundMessage.findMany({
            where: { toPhone: body.forPhone, status: 'PENDING', channel: 'USER_WHATSAPP' }
        });
    }
}

@Controller('outbound')
export class OutboundController {
    constructor(private prisma: PrismaService) { }

    @Get('pending')
    async getPending() {
        return this.prisma.outboundMessage.findMany({
            where: { status: 'PENDING' }
        });
    }

    @Post(':id/mark-sent')
    async markSent(@Param('id') id: string) {
        return this.prisma.outboundMessage.update({
            where: { id },
            data: { status: 'SENT' }
        });
    }
}
