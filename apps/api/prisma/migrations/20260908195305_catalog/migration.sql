-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "professions" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "benefit" TEXT NOT NULL,
    "needs" TEXT[],
    "monthlyPriceEur" INTEGER NOT NULL DEFAULT 89,
    "setupPriceEur" INTEGER NOT NULL DEFAULT 0,
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "position" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "professions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_templates" (
    "id" UUID NOT NULL,
    "professionId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "assistant_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_template_versions" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "TemplateStatus" NOT NULL DEFAULT 'draft',
    "content" JSONB NOT NULL,
    "publishedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "assistant_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "professions_slug_key" ON "professions"("slug");

-- CreateIndex
CREATE INDEX "professions_sector_idx" ON "professions"("sector");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_templates_professionId_key" ON "assistant_templates"("professionId");

-- CreateIndex
CREATE INDEX "assistant_template_versions_templateId_status_idx" ON "assistant_template_versions"("templateId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_template_versions_templateId_version_key" ON "assistant_template_versions"("templateId", "version");

-- AddForeignKey
ALTER TABLE "assistant_templates" ADD CONSTRAINT "assistant_templates_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "professions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_template_versions" ADD CONSTRAINT "assistant_template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "assistant_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
