import { Injectable, Logger } from '@nestjs/common';
import { WhatsappMessageDto } from '../dto/whatsapp-message.dto';
import { WhatsappService } from './whatsapp.service';

interface AuditSession {
    mode: 'IDLE' | 'AUDIT_SESSION';
    csvText: string | null;
    changesText: string | null;
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);
    private sessionStore = new Map<string, AuditSession>();

    constructor(private whatsappService: WhatsappService) { }

    async handleIncomingMessage(dto: WhatsappMessageDto, customProvider: any = null) {
        // Allows injecting a mock provider for Dev mode
        const provider = customProvider || this.whatsappService;
        const { userId, text, media } = dto;
        const state = this.getSession(userId);

        this.logger.log(`Processing message for ${userId} in state ${state.mode}`);

        // 1. Handle Commands
        if (text) {
            const command = text.trim().toUpperCase();
            if (command === 'AUDIT_START') return this.handleStart(userId, provider);
            if (command === 'AUDIT_RESET') return this.handleReset(userId, provider);
            if (command === 'AUDIT_RUN') return this.handleRun(userId, state, provider);
        }

        // 2. State-based handling
        if (state.mode === 'AUDIT_SESSION') {
            if (media) {
                return this.handleMedia(userId, state, media, provider);
            }
            if (text) {
                if (this.looksLikeCsv(text)) {
                    state.csvText = text;
                    this.updateSession(userId, state);
                    await provider.sendText(userId, '✅ CSV recibido y guardado (texto detectado).');
                    return;
                }

                state.changesText = text;
                this.updateSession(userId, state);
                await provider.sendText(userId, '📝 Descripción de cambios actualizada.');
                return;
            }
        }

        // Fallback / IDLE
        if (state.mode === 'IDLE') {
            await provider.sendText(userId, 'Envía *AUDIT_START* para comenzar una auditoría.');
        }
    }

    private async handleStart(userId: string, provider: any) {
        const state: AuditSession = { mode: 'AUDIT_SESSION', csvText: null, changesText: null };
        this.updateSession(userId, state);
        await provider.sendText(userId, '🤖 *Sesión de Auditoría Iniciada*\n\n1. Envía el archivo CSV o pégalo como texto.\n2. Envía los cambios realizados.\n3. Escribe *AUDIT_RUN* para ejecutar.');
    }

    private async handleReset(userId: string, provider: any) {
        this.sessionStore.delete(userId);
        const state: AuditSession = { mode: 'IDLE', csvText: null, changesText: null };
        this.updateSession(userId, state);
        await provider.sendText(userId, '🔄 Sesión reiniciada. Estado limpio.');
    }

    private async handleRun(userId: string, state: AuditSession, provider: any) {
        if (!state.csvText) {
            return provider.sendText(userId, '❌ Falta el archivo CSV. Por favor envíalo.');
        }
        if (!state.changesText) {
            return provider.sendText(userId, '❌ Faltan los comentarios de cambios. Por favor escríbelos.');
        }

        await provider.sendText(userId, '⏳ Ejecutando auditoría con LLM... (esto puede tardar unos segundos)');

        try {
            const llmResponse = await this.callLLM(state.csvText, state.changesText);
            const chunks = this.chunkString(llmResponse);

            for (const chunk of chunks) {
                await provider.sendText(userId, chunk);
            }

            await provider.sendText(userId, '\n✅ Fin del reporte.');
        } catch (error) {
            this.logger.error('LLM Error:', error);
            await provider.sendText(userId, '❌ Error al procesar la auditoría.');
        }
    }

    private async handleMedia(userId: string, state: AuditSession, media: any, provider: any) {
        const allowedMimes = ['text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel', 'application/octet-stream'];
        // Strict check can be relaxed if needed
        const isCsv = allowedMimes.some(type => media.mimeType.includes(type)) || (media.filename && media.filename.endsWith('.csv'));

        if (!isCsv) {
            return provider.sendText(userId, '❌ Tipo de archivo no permitido. Solo se aceptan archivos CSV (.csv) o texto.');
        }

        try {
            const buffer = await provider.downloadMedia(media.id);
            const content = buffer.toString('utf-8');

            if (!this.looksLikeCsv(content)) {
                return provider.sendText(userId, '⚠️ El archivo recibido no parece un CSV válido (formato esperado: separado por comas o punto y coma).');
            }

            state.csvText = content;
            this.updateSession(userId, state);
            await provider.sendText(userId, '✅ Archivo CSV procesado correctamente.');
        } catch (error) {
            this.logger.error('Media download error:', error);
            await provider.sendText(userId, '❌ Error al descargar o procesar el archivo.');
        }
    }

    private getSession(userId: string): AuditSession {
        if (!this.sessionStore.has(userId)) {
            this.sessionStore.set(userId, { mode: 'IDLE', csvText: null, changesText: null });
        }
        return this.sessionStore.get(userId)!;
    }

    private updateSession(userId: string, state: AuditSession) {
        this.sessionStore.set(userId, state);
    }

    private looksLikeCsv(text: string): boolean {
        if (!text || text.length < 5) return false;
        const lines = text.split('\n').slice(0, 5);
        return lines.some(line => line.includes(',') || line.includes(';'));
    }

    private chunkString(str: string, size = 4096): string[] {
        const numChunks = Math.ceil(str.length / size);
        const chunks = new Array(numChunks);
        for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
            chunks[i] = str.substr(o, size);
        }
        return chunks;
    }

    // Stub for LLM
    private async callLLM(csv: string, changes: string): Promise<string> {
        this.logger.log(`Calling LLM Stub with CSV length ${csv.length}`);
        await new Promise(r => setTimeout(r, 1000));
        return `🔍 **Reporte de Auditoría Generado**\n\n` +
            `**Análisis de Cambios:**\n${changes}\n\n` +
            `**Resultados del CSV:**\nSe procesaron ${csv.split('\\n').length} filas.\n` +
            `Todo parece correcto según los parámetros prestablecidos (Respuesta simulada desde NestJS).`;
    }
}
