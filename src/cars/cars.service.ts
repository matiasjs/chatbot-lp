import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CarsService {
    constructor(private prisma: PrismaService) { }

    async findAll(query: { make?: string; model?: string; year?: number }) {
        const { make, model, year } = query;
        return this.prisma.car.findMany({
            where: {
                make: make ? { contains: make, mode: 'insensitive' } : undefined,
                model: model ? { contains: model, mode: 'insensitive' } : undefined,
                OR: year ? [{ yearFrom: { lte: year }, yearTo: { gte: year } }, { yearFrom: { lte: year }, yearTo: null }] : undefined,
            },
        });
    }

    async findExact(make: string, model: string, year?: number, trim?: string, engine?: string) {
        // Deterministic search for strict matching
        return this.prisma.car.findFirst({
            where: {
                make: { equals: make, mode: 'insensitive' },
                model: { equals: model, mode: 'insensitive' },
                AND: [
                    year ? { yearFrom: { lte: year } } : {},
                    year ? { OR: [{ yearTo: { gte: year } }, { yearTo: null }] } : {}
                ],
                trim: trim ? { contains: trim, mode: 'insensitive' } : undefined,
                engineCode: engine ? { contains: engine, mode: 'insensitive' } : undefined
            }
        });
    }

    async create(data: any) {
        return this.prisma.car.create({ data });
    }
}
