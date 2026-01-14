import { PrismaService } from '../prisma/prisma.service';
export declare class ConversationsService {
    private prisma;
    constructor(prisma: PrismaService);
    findOrCreate(phone: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userPhone: string;
        state: string;
        lastDetected: import("@prisma/client/runtime/library").JsonValue | null;
        pendingTicketId: string | null;
    }>;
    updateState(id: string, state: string, lastDetected?: any, pendingTicketId?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userPhone: string;
        state: string;
        lastDetected: import("@prisma/client/runtime/library").JsonValue | null;
        pendingTicketId: string | null;
    }>;
}
