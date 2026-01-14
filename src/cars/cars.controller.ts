import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CarsService } from './cars.service';

@Controller('cars')
export class CarsController {
    constructor(private readonly carsService: CarsService) { }

    @Get('search')
    search(@Query('make') make: string, @Query('model') model: string, @Query('year') year: string) {
        return this.carsService.findAll({ make, model, year: year ? parseInt(year) : undefined });
    }

    // Basic seed endpoint or create
    @Post()
    create(@Body() body: any) {
        return this.carsService.create(body);
    }
}
