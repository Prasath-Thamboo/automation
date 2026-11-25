-- CreateEnum
CREATE TYPE "SavedCardStatus" AS ENUM ('en_attente', 'active', 'retiree');

-- CreateTable
CREATE TABLE "saved_cards" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "SavedCardStatus" NOT NULL DEFAULT 'en_attente',
    "setupRef" TEXT NOT NULL,
    "customerRef" TEXT,
    "methodRef" TEXT,
    "brand" TEXT,
    "last4" TEXT,
    "expMonth" INTEGER,
    "expYear" INTEGER,
    "activatedAt" TIMESTAMPTZ(6),
    "removedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "saved_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saved_cards_setupRef_key" ON "saved_cards"("setupRef");

-- CreateIndex
CREATE INDEX "saved_cards_organizationId_status_idx" ON "saved_cards"("organizationId", "status");
