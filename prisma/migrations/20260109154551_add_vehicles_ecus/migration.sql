-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "type" TEXT,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "version_text" TEXT,
    "engine_name" TEXT,
    "engine_type_code" TEXT,
    "fuel" TEXT,
    "power_ps" INTEGER,
    "power_kw" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecus" (
    "id" TEXT NOT NULL,
    "maker" TEXT,
    "mcu_type" TEXT,
    "ecu_model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_ecu_offers" (
    "id" TEXT NOT NULL,
    "tool_code" TEXT,
    "connection_modes" TEXT[],
    "price_text" TEXT,
    "vehicle_id" TEXT NOT NULL,
    "ecu_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_ecu_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicles_brand_model_idx" ON "vehicles"("brand", "model");

-- CreateIndex
CREATE INDEX "vehicles_engine_type_code_idx" ON "vehicles"("engine_type_code");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_brand_model_version_text_engine_name_engine_type_c_key" ON "vehicles"("brand", "model", "version_text", "engine_name", "engine_type_code", "fuel");

-- CreateIndex
CREATE UNIQUE INDEX "ecus_maker_mcu_type_ecu_model_key" ON "ecus"("maker", "mcu_type", "ecu_model");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_ecu_offers_tool_code_vehicle_id_ecu_id_key" ON "vehicle_ecu_offers"("tool_code", "vehicle_id", "ecu_id");

-- AddForeignKey
ALTER TABLE "vehicle_ecu_offers" ADD CONSTRAINT "vehicle_ecu_offers_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_ecu_offers" ADD CONSTRAINT "vehicle_ecu_offers_ecu_id_fkey" FOREIGN KEY ("ecu_id") REFERENCES "ecus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
