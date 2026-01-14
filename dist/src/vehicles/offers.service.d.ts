import { PrismaService } from '../prisma/prisma.service';
export declare class OffersService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(params: {
        brand?: string;
        model?: string;
        ecuMaker?: string;
        connectionMode?: string;
    }): Promise<({
        vehicle: {
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
        };
        ecu: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            maker: string | null;
            mcuType: string | null;
            ecuModel: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        toolCode: string | null;
        connectionModes: string[];
        priceText: string | null;
        vehicleId: string;
        ecuId: string;
    })[]>;
}
