import { TicketsService } from './tickets.service';
export declare class TicketsController {
    private readonly ticketsService;
    constructor(ticketsService: TicketsService);
    reply(body: {
        ticketId: string;
        expertPhone: string;
        text: string;
    }): Promise<{
        success: boolean;
        knowledge: any;
    }>;
}
