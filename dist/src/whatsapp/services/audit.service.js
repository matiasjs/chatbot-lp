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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const whatsapp_service_1 = require("./whatsapp.service");
let AuditService = AuditService_1 = class AuditService {
    whatsappService;
    logger = new common_1.Logger(AuditService_1.name);
    sessionStore = new Map();
    constructor(whatsappService) {
        this.whatsappService = whatsappService;
    }
    async handleIncomingMessage(dto, customProvider = null) {
        const provider = customProvider || this.whatsappService;
        const { userId, text, media } = dto;
        const state = this.getSession(userId);
        this.logger.log(`Processing message for ${userId} in state ${state.mode}`);
        if (text) {
            const command = text.trim().toUpperCase();
            if (command === 'AUDIT_START')
                return this.handleStart(userId, provider);
            if (command === 'AUDIT_RESET')
                return this.handleReset(userId, provider);
            if (command === 'AUDIT_RUN')
                return this.handleRun(userId, state, provider);
        }
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
        if (state.mode === 'IDLE') {
            await provider.sendText(userId, 'Envía *AUDIT_START* para comenzar una auditoría.');
        }
    }
    async handleStart(userId, provider) {
        const state = { mode: 'AUDIT_SESSION', csvText: null, changesText: null };
        this.updateSession(userId, state);
        await provider.sendText(userId, '🤖 *Sesión de Auditoría Iniciada*\n\n1. Envía el archivo CSV o pégalo como texto.\n2. Envía los cambios realizados.\n3. Escribe *AUDIT_RUN* para ejecutar.');
    }
    async handleReset(userId, provider) {
        this.sessionStore.delete(userId);
        const state = { mode: 'IDLE', csvText: null, changesText: null };
        this.updateSession(userId, state);
        await provider.sendText(userId, '🔄 Sesión reiniciada. Estado limpio.');
    }
    async handleRun(userId, state, provider) {
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
        }
        catch (error) {
            this.logger.error('LLM Error:', error);
            await provider.sendText(userId, '❌ Error al procesar la auditoría.');
        }
    }
    async handleMedia(userId, state, media, provider) {
        const allowedMimes = ['text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel', 'application/octet-stream'];
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
        }
        catch (error) {
            this.logger.error('Media download error:', error);
            await provider.sendText(userId, '❌ Error al descargar o procesar el archivo.');
        }
    }
    getSession(userId) {
        if (!this.sessionStore.has(userId)) {
            this.sessionStore.set(userId, { mode: 'IDLE', csvText: null, changesText: null });
        }
        return this.sessionStore.get(userId);
    }
    updateSession(userId, state) {
        this.sessionStore.set(userId, state);
    }
    looksLikeCsv(text) {
        if (!text || text.length < 5)
            return false;
        const lines = text.split('\n').slice(0, 5);
        return lines.some(line => line.includes(',') || line.includes(';'));
    }
    chunkString(str, size = 4096) {
        const numChunks = Math.ceil(str.length / size);
        const chunks = new Array(numChunks);
        for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
            chunks[i] = str.substr(o, size);
        }
        return chunks;
    }
    async callLLM(csv, changes) {
        this.logger.log(`Calling LLM Stub with CSV length ${csv.length}`);
        await new Promise(r => setTimeout(r, 1000));
        return `🔍 **Reporte de Auditoría Generado**\n\n` +
            `**Análisis de Cambios:**\n${changes}\n\n` +
            `**Resultados del CSV:**\nSe procesaron ${csv.split('\\n').length} filas.\n` +
            `Todo parece correcto según los parámetros prestablecidos (Respuesta simulada desde NestJS).`;
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsappService])
], AuditService);
//# sourceMappingURL=audit.service.js.map