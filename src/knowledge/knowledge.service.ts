import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIClientService } from '../openai/openai-client.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KnowledgeService {
    constructor(
        private prisma: PrismaService,
        private openai: OpenAIClientService,
        private config: ConfigService
    ) { }

    async findRelevant(text: string, scopeType?: string, scopeId?: string) {
        // 1. Vector Search (if enabled)
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
            // Note: Prisma raw query for vector.
            // We need to cast uuid to text if issues arise, but id is uuid.
            vectorResults = await this.prisma.$queryRawUnsafe(vectorQuery, embedding) as any[];
        }

        // 2. Keyword/Scope Search (Refinement)
        const dbResults = await this.prisma.qaEntry.findMany({
            where: {
                status: 'VERIFIED',
                OR: [
                    { intent: { contains: text, mode: 'insensitive' } },
                    { questionCanonical: { contains: text, mode: 'insensitive' } }
                ],
                AND: scopeType ? { scopeType } : undefined, // Relaxed scope check
                // scopeId: scopeId ? { equals: scopeId } : undefined
            },
            take: 3
        });

        return { vector: vectorResults, exact: dbResults };
    }

    async create(data: any) {
        // Ensure vector is generated if needed
        if (!data.questionEmbedding && this.config.get('FEATURE_VECTOR_SEARCH') === 'true') {
            const textToEmbed = data.questionCanonical + ' ' + data.intent + ' ' + (data.tags || []).join(' ');
            const embedding = await this.openai.createEmbedding(textToEmbed);
            // We'll insert it raw or handle it. Prisma vector support with TypedSQL/Extensions is tricky in direct create.
            // We might need a raw update after create.
        }
        return this.prisma.qaEntry.create({ data });
    }

    async upsertVerification(knowledgeDto: any) {
        // Logic to versioning
        if (knowledgeDto.versioning.should_replace_existing && knowledgeDto.versioning.replaces_qa_id) {
            await this.prisma.qaEntry.update({
                where: { id: knowledgeDto.versioning.replaces_qa_id },
                data: { replacedBy: 'NEW_ID_PLACEHOLDER' } // Complex logic, simplified for now
            });
        }

        const embedding = await this.openai.createEmbedding(knowledgeDto.question_canonical);

        // Create new
        // Note: We need raw query to insert vector or use specific prisma typedsql.
        // For MVP, we will try to use the extension if supported by client, or ignore vector insert here and use raw.

        const id = crypto.randomUUID();

        await this.prisma.$executeRaw`
        INSERT INTO qa_entries (id, scope_type, scope_id, intent, question_canonical, answer, tags, status, created_by, version, source_ticket_id, created_at, updated_at, question_embedding)
        VALUES (${id}::uuid, ${knowledgeDto.scope_type}, ${knowledgeDto.scope_id}, ${knowledgeDto.intent}, ${knowledgeDto.question_canonical}, ${knowledgeDto.answer}, ${knowledgeDto.tags}, ${knowledgeDto.status}, 'EXPERT', 1, null, NOW(), NOW(), ${embedding}::vector)
      `;

        return { id };
    }
}
