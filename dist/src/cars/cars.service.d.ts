import { PrismaService } from '../prisma/prisma.service';
export declare class CarsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(query: {
        make?: string;
        model?: string;
        year?: number;
    }): Promise<{
        id: string;
        make: string;
        model: string;
        trim: string | null;
        yearFrom: number | null;
        yearTo: number | null;
        engineCode: string | null;
        engineDesc: string | null;
        displacementCc: number | null;
        hp: number | null;
        torqueNm: number | null;
        turbo: boolean | null;
        fuelType: string | null;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findExact(make: string, model: string, year?: number, trim?: string, engine?: string): Promise<{
        id: string;
        make: string;
        model: string;
        trim: string | null;
        yearFrom: number | null;
        yearTo: number | null;
        engineCode: string | null;
        engineDesc: string | null;
        displacementCc: number | null;
        hp: number | null;
        torqueNm: number | null;
        turbo: boolean | null;
        fuelType: string | null;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    create(data: any): Promise<{
        id: string;
        make: string;
        model: string;
        trim: string | null;
        yearFrom: number | null;
        yearTo: number | null;
        engineCode: string | null;
        engineDesc: string | null;
        displacementCc: number | null;
        hp: number | null;
        torqueNm: number | null;
        turbo: boolean | null;
        fuelType: string | null;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
