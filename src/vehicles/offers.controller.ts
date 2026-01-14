import { Controller, Get, Query } from '@nestjs/common';
import { OffersService } from './offers.service';

@Controller('offers')
export class OffersController {
    constructor(private readonly offersService: OffersService) { }

    @Get('search')
    search(
        @Query('brand') brand: string,
        @Query('model') model: string,
        @Query('ecuMaker') ecuMaker: string,
        @Query('connectionMode') connectionMode: string,
    ) {
        return this.offersService.findAll({ brand, model, ecuMaker, connectionMode });
    }
}
