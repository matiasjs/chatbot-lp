import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
    constructor(private prisma: PrismaService) { }

    async findOrCreate(phone: string) {
        let conv = await this.prisma.conversation.findUnique({ where: { userPhone: phone } });
        if (!conv) {
            conv = await this.prisma.conversation.create({
                data: {
                    userPhone: phone,
                    state: 'NORMAL'
                }
            });
        }
        return conv;
    }

    async updateState(id: string, state: string, lastDetected?: any, pendingTicketId?: string) {
        return this.prisma.conversation.update({
            where: { id },
            data: {
                state,
                lastDetected: lastDetected || undefined,
                pendingTicketId: pendingTicketId || undefined
            }
        });
    }
}
