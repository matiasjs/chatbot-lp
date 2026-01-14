-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "user_phone" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "last_detected" JSONB,
    "pending_ticket_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cars" (
    "id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "trim" TEXT,
    "year_from" INTEGER,
    "year_to" INTEGER,
    "engine_code" TEXT,
    "engine_desc" TEXT,
    "displacement_cc" INTEGER,
    "hp" INTEGER,
    "torque_nm" INTEGER,
    "turbo" BOOLEAN,
    "fuel_type" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qa_entries" (
    "id" TEXT NOT NULL,
    "scope_type" TEXT NOT NULL,
    "scope_id" TEXT,
    "intent" TEXT NOT NULL,
    "question_canonical" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "tags" TEXT[],
    "status" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "source_ticket_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "replaced_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "question_embedding" vector(1536),

    CONSTRAINT "qa_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_phone" TEXT NOT NULL,
    "expert_phone" TEXT NOT NULL,
    "question_raw" TEXT NOT NULL,
    "detected_car_id" TEXT,
    "status" TEXT NOT NULL,
    "expert_answer_raw" TEXT,
    "final_answer_sent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_messages" (
    "id" TEXT NOT NULL,
    "to_phone" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "related_ticket_id" TEXT,
    "related_conversation_id" TEXT,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbound_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_user_phone_key" ON "conversations"("user_phone");

-- CreateIndex
CREATE INDEX "cars_make_model_idx" ON "cars"("make", "model");

-- CreateIndex
CREATE INDEX "cars_make_model_trim_idx" ON "cars"("make", "model", "trim");

-- AddForeignKey
ALTER TABLE "qa_entries" ADD CONSTRAINT "qa_entries_source_ticket_id_fkey" FOREIGN KEY ("source_ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qa_entries" ADD CONSTRAINT "qa_entries_scope_id_fkey" FOREIGN KEY ("scope_id") REFERENCES "cars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_detected_car_id_fkey" FOREIGN KEY ("detected_car_id") REFERENCES "cars"("id") ON DELETE SET NULL ON UPDATE CASCADE;
