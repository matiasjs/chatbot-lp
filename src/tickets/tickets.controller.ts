import { Body, Controller, Post } from '@nestjs/common';
import { TicketsService } from './tickets.service';

@Controller('expert')
export class TicketsController {
    constructor(private readonly ticketsService: TicketsService) { }

    @Post('reply')
    async reply(@Body() body: { ticketId: string; expertPhone: string; text: string }) {
        return this.ticketsService.resolve(body.ticketId, body.expertPhone, body.text);
    }
}
