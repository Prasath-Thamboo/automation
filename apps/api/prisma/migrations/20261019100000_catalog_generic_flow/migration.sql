-- Lot 16 : employé « prêt à l'emploi » générique (flux n8n par métier) + essai gratuit.
ALTER TABLE "professions" ADD COLUMN "workflowUrl" TEXT;
ALTER TABLE "professions" ADD COLUMN "defaultSwitches" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "subscriptions" ADD COLUMN "trialEndsAt" TIMESTAMPTZ(6);
