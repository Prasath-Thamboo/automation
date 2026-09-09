-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('propose', 'confirme', 'annule');

-- AlterTable
ALTER TABLE "assistants" ADD COLUMN     "publicId" TEXT;

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "assistantId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "conversationId" UUID,
    "customerLabel" TEXT,
    "requestedText" TEXT NOT NULL,
    "slot" TIMESTAMPTZ(6),
    "status" "AppointmentStatus" NOT NULL DEFAULT 'propose',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointments_assistantId_createdAt_idx" ON "appointments"("assistantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "assistants_publicId_key" ON "assistants"("publicId");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

