"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const csv_parse_1 = require("csv-parse");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const prisma = new client_1.PrismaClient();
async function importVehicles() {
    const csvFilePath = path.resolve(__dirname, '../../data/vehicles-list.csv');
    console.log(`Reading CSV from ${csvFilePath}`);
    if (!fs.existsSync(csvFilePath)) {
        console.error('File not found:', csvFilePath);
        process.exit(1);
    }
    const parser = fs
        .createReadStream(csvFilePath)
        .pipe((0, csv_parse_1.parse)({
        columns: true,
        trim: true,
        skip_empty_lines: true,
        delimiter: [';', ','],
        skip_records_with_error: true
    }));
    parser.on('skip', (err) => {
        console.warn(`Skipped invalid row: ${err.message}`);
        errors++;
    });
    let processed = 0;
    let errors = 0;
    for await (const row of parser) {
        try {
            processed++;
            const { Type: type, Brand: brand, Model: model, Version: versionText, Engine: engineName, 'Engine type': engineTypeCode, Fuel: fuel, 'Power(PS)': powerPsStr, 'Power(KW)': powerKwStr, 'Ecu maker': ecuMaker, 'MCU Type': mcuType, 'Ecu model': ecuModel, 'Connection mode': connectionModeStr, Price: priceText, Tool: toolCode } = row;
            const powerPs = parseInt(powerPsStr) || null;
            const powerKw = parseInt(powerKwStr) || null;
            const connectionModes = (connectionModeStr || '')
                .split(',')
                .map((s) => s.trim().toUpperCase())
                .filter((s) => s.length > 0);
            const vehicleData = {
                type: type || null,
                brand,
                model,
                versionText: versionText || null,
                engineName: engineName || null,
                engineTypeCode: engineTypeCode || null,
                fuel: fuel || null,
                powerPs,
                powerKw
            };
            let vehicle = await prisma.vehicle.findFirst({
                where: {
                    brand: vehicleData.brand,
                    model: vehicleData.model,
                    versionText: vehicleData.versionText,
                    engineName: vehicleData.engineName,
                    engineTypeCode: vehicleData.engineTypeCode,
                    fuel: vehicleData.fuel
                }
            });
            if (!vehicle) {
                vehicle = await prisma.vehicle.create({ data: vehicleData });
            }
            const ecuData = {
                maker: ecuMaker || null,
                mcuType: mcuType || null,
                ecuModel: ecuModel || null
            };
            let ecu = await prisma.ecu.findFirst({
                where: {
                    maker: ecuData.maker,
                    mcuType: ecuData.mcuType,
                    ecuModel: ecuData.ecuModel
                }
            });
            if (!ecu) {
                ecu = await prisma.ecu.create({ data: ecuData });
            }
            const offerData = {
                toolCode: toolCode || null,
                connectionModes,
                priceText: priceText || null,
                vehicleId: vehicle.id,
                ecuId: ecu.id
            };
            let offer = await prisma.vehicleEcuOffer.findFirst({
                where: {
                    toolCode: offerData.toolCode,
                    vehicleId: offerData.vehicleId,
                    ecuId: offerData.ecuId
                }
            });
            if (offer) {
                await prisma.vehicleEcuOffer.update({
                    where: { id: offer.id },
                    data: { connectionModes, priceText: offerData.priceText }
                });
            }
            else {
                await prisma.vehicleEcuOffer.create({ data: offerData });
            }
            if (processed % 100 === 0) {
                console.log(`Processed ${processed} rows...`);
            }
        }
        catch (err) {
            errors++;
            console.error(`Error processing row ${processed}:`, err);
            console.error('Row:', row);
        }
    }
    console.log(`Import finished. Processed: ${processed}. Errors: ${errors}.`);
}
importVehicles()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=import-vehicles.js.map