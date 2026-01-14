import { PrismaService } from '../prisma/prisma.service';
export declare class VehiclesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(params: {
        brand?: string;
        model?: string;
        engineTypeCode?: string;
        skip?: number;
        take?: number;
    }): Promise<{
        id: string;
        model: string;
        createdAt: Date;
        updatedAt: Date;
        type: string | null;
        brand: string;
        versionText: string | null;
        engineName: string | null;
        engineTypeCode: string | null;
        fuel: string | null;
        powerPs: number | null;
        powerKw: number | null;
    }[]>;
}
