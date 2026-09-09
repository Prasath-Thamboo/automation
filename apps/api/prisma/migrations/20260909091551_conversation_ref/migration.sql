-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "externalRef" TEXT;

-- CreateIndex
CREATE INDEX "conversations_assistantId_externalRef_idx" ON "conversations"("assistantId", "externalRef");

