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
exports.CarsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CarsService = class CarsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const { make, model, year } = query;
        return this.prisma.car.findMany({
            where: {
                make: make ? { contains: make, mode: 'insensitive' } : undefined,
                model: model ? { contains: model, mode: 'insensitive' } : undefined,
                OR: year ? [{ yearFrom: { lte: year }, yearTo: { gte: year } }, { yearFrom: { lte: year }, yearTo: null }] : undefined,
            },
        });
    }
    async findExact(make, model, year, trim, engine) {
        return this.prisma.car.findFirst({
            where: {
                make: { equals: make, mode: 'insensitive' },
                model: { equals: model, mode: 'insensitive' },
                AND: [
                    year ? { yearFrom: { lte: year } } : {},
                    year ? { OR: [{ yearTo: { gte: year } }, { yearTo: null }] } : {}
                ],
                trim: trim ? { contains: trim, mode: 'insensitive' } : undefined,
                engineCode: engine ? { contains: engine, mode: 'insensitive' } : undefined
            }
        });
    }
    async create(data) {
        return this.prisma.car.create({ data });
    }
};
exports.CarsService = CarsService;
exports.CarsService = CarsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CarsService);
//# sourceMappingURL=cars.service.js.map