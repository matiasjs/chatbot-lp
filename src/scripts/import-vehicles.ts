import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function importVehicles() {
    const csvFilePath = path.resolve(__dirname, '../../data/vehicles-list.csv');
    console.log(`Reading CSV from ${csvFilePath}`);

    if (!fs.existsSync(csvFilePath)) {
        console.error('File not found:', csvFilePath);
        process.exit(1);
    }

    const parser = fs
        .createReadStream(csvFilePath)
        .pipe(parse({
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

            // Map fields
            const {
                Type: type,
                Brand: brand,
                Model: model,
                Version: versionText,
                Engine: engineName,
                'Engine type': engineTypeCode,
                Fuel: fuel,
                'Power(PS)': powerPsStr,
                'Power(KW)': powerKwStr,
                'Ecu maker': ecuMaker,
                'MCU Type': mcuType,
                'Ecu model': ecuModel,
                'Connection mode': connectionModeStr,
                Price: priceText,
                Tool: toolCode
            } = row;

            // Normalize
            const powerPs = parseInt(powerPsStr) || null;
            const powerKw = parseInt(powerKwStr) || null;

            const connectionModes = (connectionModeStr || '')
                .split(',')
                .map((s: string) => s.trim().toUpperCase())
                .filter((s: string) => s.length > 0);

            // 1. Upsert Vehicle
            // Unique constraint: [brand, model, versionText, engineName, engineTypeCode, fuel]
            // Note: versionText could be null, prisma handles composite unique with nulls carefully, 
            // but usually needs strict match. If CSV has empty string, we treat as null or empty string?
            // User said "version_text text null".

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

            // Upsert Vehicle
            // We first try to find, if not create. Prisma upsert requires unique input where all fields are non-null usually 
            // or at least available in 'where'. 
            // A unique index with nullable fields in Postgres allows multiple nulls unless handled.
            // Prisma `@@unique` maps to a unique constraint.
            // Let's rely on findFirst + create for safety if upsert is tricky with nulls in composite unique.

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

            // 2. Upsert Ecu
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

            // 3. Upsert Offer
            const offerData = {
                toolCode: toolCode || null,
                connectionModes,
                priceText: priceText || null,
                vehicleId: vehicle.id,
                ecuId: ecu.id
            };

            // Unique: toolCode, vehicleId, ecuId
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
            } else {
                await prisma.vehicleEcuOffer.create({ data: offerData });
            }

            if (processed % 100 === 0) {
                console.log(`Processed ${processed} rows...`);
            }

        } catch (err) {
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
