import { Controller, Get, Query } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
export class VehiclesController {
    constructor(private readonly vehiclesService: VehiclesService) { }

    @Get('search')
    search(
        @Query('brand') brand: string,
        @Query('model') model: string,
        @Query('engineTypeCode') engineTypeCode: string,
        @Query('skip') skip: string,
        @Query('limit') limit: string,
    ) {
        return this.vehiclesService.findAll({ brand, model, engineTypeCode, skip: skip ? parseInt(skip) : 0, take: limit ? parseInt(limit) : 20 });
    }
}
