-- Lot 14 : un flux n8n par employé, piloté par des boutons.
ALTER TABLE "assistants" ADD COLUMN "workflowUrl" TEXT;

CREATE TABLE "assistant_switches" (
    "id" UUID NOT NULL,
    "assistantId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "help" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "assistant_switches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assistant_switches_assistantId_key_key" ON "assistant_switches"("assistantId", "key");
CREATE INDEX "assistant_switches_organizationId_idx" ON "assistant_switches"("organizationId");

ALTER TABLE "assistant_switches" ADD CONSTRAINT "assistant_switches_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
