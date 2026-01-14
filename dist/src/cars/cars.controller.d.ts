import { CarsService } from './cars.service';
export declare class CarsController {
    private readonly carsService;
    constructor(carsService: CarsService);
    search(make: string, model: string, year: string): Promise<{
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
    create(body: any): Promise<{
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
