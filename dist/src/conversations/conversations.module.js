"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationsModule = void 0;
const common_1 = require("@nestjs/common");
const cars_module_1 = require("../cars/cars.module");
const knowledge_module_1 = require("../knowledge/knowledge.module");
const openai_module_1 = require("../openai/openai.module");
const tickets_module_1 = require("../tickets/tickets.module");
const conversation_orchestrator_service_1 = require("./conversation-orchestrator.service");
const conversations_service_1 = require("./conversations.service");
let ConversationsModule = class ConversationsModule {
};
exports.ConversationsModule = ConversationsModule;
exports.ConversationsModule = ConversationsModule = __decorate([
    (0, common_1.Module)({
        imports: [openai_module_1.OpenAIModule, cars_module_1.CarsModule, knowledge_module_1.KnowledgeModule, tickets_module_1.TicketsModule],
        providers: [conversations_service_1.ConversationsService, conversation_orchestrator_service_1.ConversationOrchestratorService],
        exports: [conversations_service_1.ConversationsService, conversation_orchestrator_service_1.ConversationOrchestratorService],
    })
], ConversationsModule);
//# sourceMappingURL=conversations.module.js.map