"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const car1 = await prisma.car.create({
        data: {
            make: 'Volkswagen',
            model: 'Golf',
            trim: 'GTI',
            yearFrom: 2018,
            yearTo: 2021,
            engineCode: 'EA888',
            engineDesc: '2.0 TSI',
            hp: 245,
            turbo: true,
            fuelType: 'Petrol',
            notes: 'Common issue: Water pump leak.'
        }
    });
    const car2 = await prisma.car.create({
        data: {
            make: 'Toyota',
            model: 'Corolla',
            yearFrom: 2020,
            engineDesc: '1.8 Hybrid',
            hp: 122,
            turbo: false,
            fuelType: 'Hybrid'
        }
    });
    const qa = await prisma.qaEntry.create({
        data: {
            scopeType: 'GENERIC',
            intent: 'GREETING',
            questionCanonical: 'Hello',
            answer: 'Hello! I am your car expert bot. Ask me anything about car engines, specs, or maintenance.',
            status: 'VERIFIED',
            createdBy: 'SYSTEM'
        }
    });
    console.log({ car1, car2, qa });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map