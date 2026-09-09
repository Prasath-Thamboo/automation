-- CreateEnum
CREATE TYPE "AssistantState" AS ENUM ('en_formation', 'au_travail', 'en_pause');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('en_cours', 'termine');

-- CreateEnum
CREATE TYPE "ConversationChannel" AS ENUM ('telephone', 'whatsapp', 'email', 'instagram', 'formulaire', 'surplace', 'autre');

-- CreateEnum
CREATE TYPE "MessageAuthor" AS ENUM ('client', 'assistant', 'patron');

-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('ouverte', 'repondue');

-- CreateTable
CREATE TABLE "assistants" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "missionId" UUID,
    "subscriptionId" UUID,
    "professionSlug" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "state" "AssistantState" NOT NULL DEFAULT 'en_formation',
    "jobDescription" JSONB NOT NULL,
    "establishment" JSONB NOT NULL DEFAULT '{}',
    "specifics" JSONB NOT NULL DEFAULT '{}',
    "contactPrefs" JSONB NOT NULL DEFAULT '{}',
    "onboarding" "OnboardingStatus" NOT NULL DEFAULT 'en_cours',
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMPTZ(6),
    "pausedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "assistants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_instructions" (
    "id" UUID NOT NULL,
    "assistantId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdByUserId" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_instructions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "assistantId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "channel" "ConversationChannel" NOT NULL,
    "customerLabel" TEXT,
    "summary" TEXT,
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "author" "MessageAuthor" NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalations" (
    "id" UUID NOT NULL,
    "assistantId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "conversationId" UUID,
    "question" TEXT NOT NULL,
    "context" TEXT,
    "status" "EscalationStatus" NOT NULL DEFAULT 'ouverte',
    "answer" TEXT,
    "answeredByUserId" UUID,
    "answeredAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escalations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assistants_missionId_key" ON "assistants"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "assistants_subscriptionId_key" ON "assistants"("subscriptionId");

-- CreateIndex
CREATE INDEX "assistants_organizationId_idx" ON "assistants"("organizationId");

-- CreateIndex
CREATE INDEX "assistant_instructions_assistantId_idx" ON "assistant_instructions"("assistantId");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_instructions_assistantId_version_key" ON "assistant_instructions"("assistantId", "version");

-- CreateIndex
CREATE INDEX "conversations_assistantId_lastMessageAt_idx" ON "conversations"("assistantId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "escalations_organizationId_status_idx" ON "escalations"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "assistant_instructions" ADD CONSTRAINT "assistant_instructions_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
