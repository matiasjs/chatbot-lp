"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_client_service_1 = require("../openai/openai-client.service");
const prisma_service_1 = require("../prisma/prisma.service");
let KnowledgeService = class KnowledgeService {
    prisma;
    openai;
    config;
    constructor(prisma, openai, config) {
        this.prisma = prisma;
        this.openai = openai;
        this.config = config;
    }
    async findRelevant(text, scopeType, scopeId) {
        let vectorResults = [];
        if (this.config.get('FEATURE_VECTOR_SEARCH') === 'true') {
            const embedding = await this.openai.createEmbedding(text);
            const vectorQuery = `
        SELECT id, question_canonical, answer, status, 1 - (question_embedding <=> $1::vector) as similarity
        FROM qa_entries
        WHERE status = 'VERIFIED'
        ORDER BY similarity DESC
        LIMIT 3
      `;
            vectorResults = await this.prisma.$queryRawUnsafe(vectorQuery, embedding);
        }
        const dbResults = await this.prisma.qaEntry.findMany({
            where: {
                status: 'VERIFIED',
                OR: [
                    { intent: { contains: text, mode: 'insensitive' } },
                    { questionCanonical: { contains: text, mode: 'insensitive' } }
                ],
                AND: scopeType ? { scopeType } : undefined,
            },
            take: 3
        });
        return { vector: vectorResults, exact: dbResults };
    }
    async create(data) {
        if (!data.questionEmbedding && this.config.get('FEATURE_VECTOR_SEARCH') === 'true') {
            const textToEmbed = data.questionCanonical + ' ' + data.intent + ' ' + (data.tags || []).join(' ');
            const embedding = await this.openai.createEmbedding(textToEmbed);
        }
        return this.prisma.qaEntry.create({ data });
    }
    async upsertVerification(knowledgeDto) {
        if (knowledgeDto.versioning.should_replace_existing && knowledgeDto.versioning.replaces_qa_id) {
            await this.prisma.qaEntry.update({
                where: { id: knowledgeDto.versioning.replaces_qa_id },
                data: { replacedBy: 'NEW_ID_PLACEHOLDER' }
            });
        }
        const embedding = await this.openai.createEmbedding(knowledgeDto.question_canonical);
        const id = crypto.randomUUID();
        await this.prisma.$executeRaw `
        INSERT INTO qa_entries (id, scope_type, scope_id, intent, question_canonical, answer, tags, status, created_by, version, source_ticket_id, created_at, updated_at, question_embedding)
        VALUES (${id}::uuid, ${knowledgeDto.scope_type}, ${knowledgeDto.scope_id}, ${knowledgeDto.intent}, ${knowledgeDto.question_canonical}, ${knowledgeDto.answer}, ${knowledgeDto.tags}, ${knowledgeDto.status}, 'EXPERT', 1, null, NOW(), NOW(), ${embedding}::vector)
      `;
        return { id };
    }
};
exports.KnowledgeService = KnowledgeService;
exports.KnowledgeService = KnowledgeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        openai_client_service_1.OpenAIClientService,
        config_1.ConfigService])
], KnowledgeService);
//# sourceMappingURL=knowledge.service.js.map