import { VehiclesService } from './vehicles.service';
export declare class VehiclesController {
    private readonly vehiclesService;
    constructor(vehiclesService: VehiclesService);
    search(brand: string, model: string, engineTypeCode: string, skip: string, limit: string): Promise<{
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
