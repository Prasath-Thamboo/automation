-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('brouillon', 'en_relecture', 'envoye', 'vu', 'accepte', 'refuse', 'expire');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('a_preparer', 'en_preparation', 'en_service', 'annulee');

-- CreateEnum
CREATE TYPE "PricingRuleKind" AS ENUM ('socle', 'module', 'volume', 'outil');

-- CreateTable
CREATE TABLE "counters" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "counters_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "needs_assessments" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "resumeTokenHash" TEXT NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMPTZ(6),
    "organizationId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "needs_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_descriptions" (
    "id" UUID NOT NULL,
    "needsAssessmentId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" UUID NOT NULL,
    "kind" "PricingRuleKind" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "setupCents" INTEGER NOT NULL DEFAULT 0,
    "monthlyCents" INTEGER NOT NULL DEFAULT 0,
    "factor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "needsAssessmentId" UUID NOT NULL,
    "organizationId" UUID,
    "number" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'brouillon',
    "formula" TEXT NOT NULL,
    "setupCents" INTEGER NOT NULL DEFAULT 0,
    "monthlyCents" INTEGER NOT NULL DEFAULT 0,
    "complexityFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "complexityNote" TEXT,
    "engagementMonths" INTEGER NOT NULL DEFAULT 0,
    "serviceDelayDays" INTEGER NOT NULL DEFAULT 14,
    "content" JSONB NOT NULL,
    "sentAt" TIMESTAMPTZ(6),
    "viewedAt" TIMESTAMPTZ(6),
    "decidedAt" TIMESTAMPTZ(6),
    "expiresAt" TIMESTAMPTZ(6),
    "reminderJ7At" TIMESTAMPTZ(6),
    "reminderJ21At" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_line_items" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "setupCents" INTEGER NOT NULL DEFAULT 0,
    "monthlyCents" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quote_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_acceptances" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "acceptedName" TEXT NOT NULL,
    "cgvAccepted" BOOLEAN NOT NULL,
    "ip" TEXT,
    "contentHash" TEXT NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missions" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'a_preparer',
    "jobDescription" JSONB NOT NULL,
    "answers" JSONB NOT NULL,
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "needs_assessments_resumeTokenHash_key" ON "needs_assessments"("resumeTokenHash");

-- CreateIndex
CREATE INDEX "needs_assessments_email_idx" ON "needs_assessments"("email");

-- CreateIndex
CREATE UNIQUE INDEX "job_descriptions_needsAssessmentId_key" ON "job_descriptions"("needsAssessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_rules_kind_key_key" ON "pricing_rules"("kind", "key");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_needsAssessmentId_key" ON "quotes"("needsAssessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_number_key" ON "quotes"("number");

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "quotes"("status");

-- CreateIndex
CREATE INDEX "quote_line_items_quoteId_idx" ON "quote_line_items"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "quote_acceptances_quoteId_key" ON "quote_acceptances"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "missions_quoteId_key" ON "missions"("quoteId");

-- CreateIndex
CREATE INDEX "missions_organizationId_idx" ON "missions"("organizationId");

-- CreateIndex
CREATE INDEX "missions_status_idx" ON "missions"("status");

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_needsAssessmentId_fkey" FOREIGN KEY ("needsAssessmentId") REFERENCES "needs_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_needsAssessmentId_fkey" FOREIGN KEY ("needsAssessmentId") REFERENCES "needs_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_acceptances" ADD CONSTRAINT "quote_acceptances_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
