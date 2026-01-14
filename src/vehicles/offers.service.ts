import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OffersService {
    constructor(private prisma: PrismaService) { }

    async findAll(params: { brand?: string; model?: string; ecuMaker?: string; connectionMode?: string }) {
        const { brand, model, ecuMaker, connectionMode } = params;
        return this.prisma.vehicleEcuOffer.findMany({
            where: {
                vehicle: {
                    brand: brand ? { contains: brand, mode: 'insensitive' } : undefined,
                    model: model ? { contains: model, mode: 'insensitive' } : undefined,
                },
                ecu: {
                    maker: ecuMaker ? { contains: ecuMaker, mode: 'insensitive' } : undefined,
                },
                connectionModes: connectionMode ? { has: connectionMode.toUpperCase() } : undefined
            },
            include: {
                vehicle: true,
                ecu: true
            },
            take: 50
        });
    }
}
