import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VehiclesService {
    constructor(private prisma: PrismaService) { }

    async findAll(params: { brand?: string; model?: string; engineTypeCode?: string; skip?: number; take?: number }) {
        const { brand, model, engineTypeCode, skip, take } = params;
        return this.prisma.vehicle.findMany({
            where: {
                brand: brand ? { contains: brand, mode: 'insensitive' } : undefined,
                model: model ? { contains: model, mode: 'insensitive' } : undefined,
                engineTypeCode: engineTypeCode ? { contains: engineTypeCode, mode: 'insensitive' } : undefined,
            },
            skip: skip ? Number(skip) : undefined,
            take: take ? Number(take) : 20,
        });
    }
}
