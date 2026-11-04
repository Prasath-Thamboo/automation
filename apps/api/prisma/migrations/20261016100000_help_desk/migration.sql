-- Lot 15 : aide au patron (« Une question ? »).
CREATE TYPE "HelpAction" AS ENUM ('aucune', 'equipe', 'documents', 'compte', 'reglages', 'carnet');
CREATE TYPE "HelpRequestStatus" AS ENUM ('repondue', 'sans_reponse', 'transmise', 'traitee');

CREATE TABLE "help_articles" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "keywords" TEXT[],
    "answer" TEXT NOT NULL,
    "action" "HelpAction" NOT NULL DEFAULT 'aucune',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "help_articles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "help_requests" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "articleId" UUID,
    "status" "HelpRequestStatus" NOT NULL,
    "helpful" BOOLEAN,
    "staffAnswer" TEXT,
    "transmittedAt" TIMESTAMPTZ(6),
    "answeredAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "help_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "help_articles_slug_key" ON "help_articles"("slug");
CREATE INDEX "help_requests_organizationId_createdAt_idx" ON "help_requests"("organizationId", "createdAt");
CREATE INDEX "help_requests_status_createdAt_idx" ON "help_requests"("status", "createdAt");

ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "help_articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
