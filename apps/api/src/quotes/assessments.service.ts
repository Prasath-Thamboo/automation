import {
  ConflictException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Prisma, type NeedsAssessment } from "@prisma/client";
import type {
  AssessmentAnswers,
  AssessmentState,
  JobDescriptionContent,
  PatchAssessment,
} from "@tando/types";
import { ENV } from "../config/config.module";
import { webBaseUrl, type Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.module";
import { AuditService } from "../audit/audit.service";
import { generateToken, hashToken } from "../auth/tokens";
import { resumeAssessmentEmail } from "./quote-mail.templates";
import { buildJobDescription, benefitsFromAnswers } from "./job-description.builder";
import { PricingService } from "./pricing/pricing.service";
import { QuoteNumberService } from "./quote-number.service";

type AssessmentWithRelations = Prisma.NeedsAssessmentGetPayload<{
  include: { jobDescription: true; quote: true };
}>;

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly audit: AuditService,
    private readonly pricing: PricingService,
    private readonly numbers: QuoteNumberService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async start(email: string): Promise<{ state: AssessmentState; resumeToken: string }> {
    const token = generateToken();
    const assessment = await this.prisma.needsAssessment.create({
      data: { email, resumeTokenHash: hashToken(token), answers: {}, currentStep: 0 },
      include: { jobDescription: true, quote: true },
    });

    await this.queue.enqueueEmail(
      resumeAssessmentEmail(email, this.resumeLink(token)),
    );
    await this.audit.record({ action: "assessment.started", target: `assessment:${assessment.id}` });

    return { state: toState(assessment), resumeToken: token };
  }

  /** Fiche de poste dérivée des réponses, sans rien enregistrer — pour la
   *  relecture par le client avant envoi (§4.1 fin). */
  preview(assessment: NeedsAssessment): JobDescriptionContent {
    return buildJobDescription(assessment.answers as AssessmentAnswers);
  }

  async state(assessmentId: string): Promise<AssessmentState> {
    const row = await this.prisma.needsAssessment.findUniqueOrThrow({
      where: { id: assessmentId },
      include: { jobDescription: true, quote: true },
    });
    return toState(row);
  }

  async patch(assessment: NeedsAssessment, dto: PatchAssessment): Promise<AssessmentState> {
    if (assessment.completedAt) {
      // On autorise encore les corrections tant que le devis n'est pas parti.
      const quote = await this.prisma.quote.findUnique({ where: { needsAssessmentId: assessment.id } });
      if (quote && quote.status !== "brouillon" && quote.status !== "en_relecture") {
        throw new ConflictException("Votre demande a déjà été traitée. Contactez-nous pour la modifier.");
      }
    }

    const merged: AssessmentAnswers = {
      ...(assessment.answers as AssessmentAnswers),
      ...dto.answers,
    };

    const row = await this.prisma.needsAssessment.update({
      where: { id: assessment.id },
      data: {
        answers: merged as Prisma.InputJsonValue,
        currentStep: dto.currentStep ?? assessment.currentStep,
      },
      include: { jobDescription: true, quote: true },
    });
    return toState(row);
  }

  /** Fige la fiche de poste (corrigée par le client) et génère le devis en brouillon. */
  async submit(
    assessment: NeedsAssessment,
    jobDescription: JobDescriptionContent,
  ): Promise<AssessmentState> {
    const existingQuote = await this.prisma.quote.findUnique({
      where: { needsAssessmentId: assessment.id },
    });
    if (
      existingQuote &&
      existingQuote.status !== "brouillon" &&
      existingQuote.status !== "en_relecture"
    ) {
      throw new ConflictException("Votre demande a déjà été envoyée.");
    }

    const answers = assessment.answers as AssessmentAnswers;
    const formula = existingQuote?.formula ?? this.pricing.suggestFormula(answers);
    const rules = await this.pricing.loadRules();
    const factor = existingQuote?.complexityFactor ?? 1;
    const pricing = this.pricing.compute(answers, formula, rules, factor);

    const content = {
      jobDescription,
      benefits: benefitsFromAnswers(answers),
      outOfScope: jobDescription.outOfScope,
      company: str(answers.entreprise) || "votre entreprise",
      contactName: str(answers.nom) || "",
    };

    const number = existingQuote?.number ?? (await this.numbers.next());

    await this.prisma.$transaction(async (tx) => {
      await tx.needsAssessment.update({
        where: { id: assessment.id },
        data: { completedAt: assessment.completedAt ?? new Date() },
      });

      await tx.jobDescription.upsert({
        where: { needsAssessmentId: assessment.id },
        create: {
          needsAssessmentId: assessment.id,
          content: jobDescription as unknown as Prisma.InputJsonValue,
        },
        update: {
          content: jobDescription as unknown as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
      });

      const quote = await tx.quote.upsert({
        where: { needsAssessmentId: assessment.id },
        create: {
          needsAssessmentId: assessment.id,
          number,
          status: "en_relecture",
          formula: pricing.formula,
          setupCents: pricing.setupCents,
          monthlyCents: pricing.monthlyCents,
          content: content as unknown as Prisma.InputJsonValue,
        },
        update: {
          status: "en_relecture",
          formula: pricing.formula,
          setupCents: pricing.setupCents,
          monthlyCents: pricing.monthlyCents,
          content: content as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.quoteLineItem.deleteMany({ where: { quoteId: quote.id } });
      await tx.quoteLineItem.createMany({
        data: pricing.lines.map((l, i) => ({
          quoteId: quote.id,
          kind: l.kind,
          label: l.label,
          setupCents: Math.round(l.setupEur * 100),
          monthlyCents: Math.round(l.monthlyEur * 100),
          position: i,
        })),
      });
    });

    await this.audit.record({
      action: "quote.draft_generated",
      target: `assessment:${assessment.id}`,
      metadata: { number },
    });

    return this.state(assessment.id);
  }

  private resumeLink(token: string): string {
    return `${webBaseUrl(this.env)}/questionnaire/reprendre?token=${encodeURIComponent(token)}`;
  }
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

function toState(a: AssessmentWithRelations): AssessmentState {
  return {
    id: a.id,
    email: a.email,
    currentStep: a.currentStep,
    answers: (a.answers as AssessmentAnswers) ?? {},
    completed: Boolean(a.completedAt),
    jobDescription: (a.jobDescription?.content as JobDescriptionContent | undefined) ?? null,
    quoteNumber: a.quote?.number ?? null,
  };
}
