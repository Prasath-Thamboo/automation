-- CreateEnum
CREATE TYPE "ChannelKind" AS ENUM ('formulaire', 'email', 'sms', 'telephone', 'whatsapp', 'instagram');

-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('en_attente', 'actif', 'desactive');

-- CreateEnum
CREATE TYPE "MessageDelivery" AS ENUM ('en_attente', 'envoye', 'echec');

-- AlterEnum
ALTER TYPE "ConversationChannel" ADD VALUE 'sms';

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "endpointId" UUID,
ADD COLUMN     "replyToEnc" TEXT,
ADD COLUMN     "threadMeta" JSONB;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "delivery" "MessageDelivery",
ADD COLUMN     "deliveryError" TEXT,
ADD COLUMN     "providerRef" TEXT;

-- CreateTable
CREATE TABLE "channel_endpoints" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "assistantId" UUID NOT NULL,
    "kind" "ChannelKind" NOT NULL,
    "address" TEXT NOT NULL,
    "status" "ChannelStatus" NOT NULL DEFAULT 'en_attente',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "secretEnc" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "channel_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "channel_endpoints_assistantId_idx" ON "channel_endpoints"("assistantId");

-- CreateIndex
CREATE INDEX "channel_endpoints_organizationId_idx" ON "channel_endpoints"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "channel_endpoints_kind_address_key" ON "channel_endpoints"("kind", "address");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "channel_endpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_endpoints" ADD CONSTRAINT "channel_endpoints_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

