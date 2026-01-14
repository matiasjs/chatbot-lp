import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';

@Controller('knowledge')
export class KnowledgeController {
    constructor(private readonly knowledgeService: KnowledgeService) { }

    @Get('search')
    search(@Query('q') q: string) {
        return this.knowledgeService.findRelevant(q);
    }

    // Admin endpoint to manually add knowledge
    @Post()
    create(@Body() body: any) {
        return this.knowledgeService.create(body);
    }
}
