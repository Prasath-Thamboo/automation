import { createHash } from "node:crypto";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AcceptQuote, AssessmentAnswers, JobDescriptionContent, PublicQuote } from "@tando/types";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.module";
import { AuditService } from "../audit/audit.service";
import { generateToken, hashToken } from "../auth/tokens";
import { quoteAcceptedEmail, quoteReminderEmail } from "./quote-mail.templates";
import { quoteWithRelations, toPublicQuote, type QuoteRow } from "./quote-mappers";

const MISSION_CHECKLIST = [
  "Relire la fiche de poste avec le client",
  "Raccorder les outils indiqués",
  "Préparer les réponses aux questions habituelles",
  "Test en conditions réelles avec le client",
  "Mise en service",
];

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly audit: AuditService,
  ) {}

  /** Retrouve un devis à partir de son numéro et du jeton envoyé au client. */
  private async resolve(number: string, token: string): Promise<QuoteRow> {
    const assessment = await this.prisma.needsAssessment.findFirst({
      where: { resumeTokenHash: hashToken(token), deletedAt: null },
      select: { id: true },
    });
    const row = assessment
      ? await this.prisma.quote.findFirst({
          where: { number, needsAssessmentId: assessment.id, deletedAt: null },
          ...quoteWithRelations,
        })
      : null;
    if (!row) throw new NotFoundException("Ce devis est introuvable ou le lien n'est plus valide.");
    return row;
  }

  /** Vue client. Marque le devis « vu » à la première ouverture. */
  async view(number: string, token: string): Promise<PublicQuote> {
    let row = await this.resolve(number, token);
    if (row.status === "envoye") {
      row = await this.prisma.quote.update({
        where: { id: row.id },
        data: { status: "vu", viewedAt: new Date() },
        ...quoteWithRelations,
      });
      await this.audit.record({ action: "quote.viewed", target: `quote:${row.id}` });
    }
    return toPublicQuote(row);
  }

  async refuse(number: string, token: string): Promise<PublicQuote> {
    const row = await this.resolve(number, token);
    if (!["envoye", "vu"].includes(row.status)) {
      throw new ConflictException("Ce devis ne peut plus être refusé.");
    }
    const updated = await this.prisma.quote.update({
      where: { id: row.id },
      data: { status: "refuse", decidedAt: new Date() },
      ...quoteWithRelations,
    });
    await this.audit.record({ action: "quote.refused", target: `quote:${row.id}` });
    return toPublicQuote(updated);
  }

  /** Acceptation en ligne horodatée (§4.2) → crée la mission (§4.3). */
  async accept(
    number: string,
    token: string,
    dto: AcceptQuote,
    ip: string | undefined,
  ): Promise<PublicQuote> {
    const row = await this.resolve(number, token);
    if (!["envoye", "vu"].includes(row.status)) {
      throw new ConflictException("Ce devis ne peut plus être accepté. Contactez-nous.");
    }

    const contentHash = createHash("sha256")
      .update(
        JSON.stringify({
          content: row.content,
          number: row.number,
          setupCents: row.setupCents,
          monthlyCents: row.monthlyCents,
        }),
      )
      .digest("hex");

    const email = row.needsAssessment.email;
    const answers = (row.needsAssessment.answers as AssessmentAnswers) ?? {};
    const jobDescription = (row.content as unknown as { jobDescription: JobDescriptionContent })
      .jobDescription;
    const companyName = str(answers.entreprise) || "Mon entreprise";

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email },
        create: { email, fullName: str(answers.nom) || null },
        update: {},
      });

      let membership = await tx.membership.findFirst({
        where: { userId: user.id, deletedAt: null },
        include: { organization: true },
      });
      if (!membership) {
        const org = await tx.organization.create({
          data: {
            name: companyName,
            slug: `${slugify(companyName)}-${randomSuffix()}`,
            memberships: { create: { userId: user.id, role: "owner" } },
          },
        });
        membership = await tx.membership.findFirstOrThrow({
          where: { userId: user.id, organizationId: org.id },
          include: { organization: true },
        });
      }
      const organizationId = membership.organizationId;

      await tx.quoteAcceptance.create({
        data: {
          quoteId: row.id,
          acceptedName: dto.name,
          cgvAccepted: dto.cgv,
          ip: ip ?? null,
          contentHash,
        },
      });

      await tx.quote.update({
        where: { id: row.id },
        data: { status: "accepte", decidedAt: new Date(), organizationId },
      });
      await tx.needsAssessment.update({
        where: { id: row.needsAssessmentId },
        data: { organizationId },
      });

      await tx.mission.create({
        data: {
          quoteId: row.id,
          organizationId,
          status: "a_preparer",
          jobDescription: jobDescription as unknown as Prisma.InputJsonValue,
          answers: answers as unknown as Prisma.InputJsonValue,
          checklist: MISSION_CHECKLIST.map((label) => ({ label, done: false })),
        },
      });
    });

    await this.audit.record({
      action: "quote.accepted",
      target: `quote:${row.id}`,
      metadata: { number, contentHash },
    });
    await this.queue.enqueueEmail(quoteAcceptedEmail(email, number));

    const fresh = await this.prisma.quote.findUniqueOrThrow({
      where: { id: row.id },
      ...quoteWithRelations,
    });
    return toPublicQuote(fresh);
  }

  // ── Tâches différées (BullMQ) ─────────────────────────────────────────────

  async handleReminder(quoteId: string, which: "j7" | "j21"): Promise<void> {
    const row = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      ...quoteWithRelations,
    });
    if (!row || !["envoye", "vu"].includes(row.status)) return;

    const token = await this.rotateToken(row.needsAssessmentId);
    const link = this.viewLink(row.number, token);
    await this.queue.enqueueEmail(quoteReminderEmail(row.needsAssessment.email, row.number, link));
    await this.prisma.quote.update({
      where: { id: quoteId },
      data: which === "j7" ? { reminderJ7At: new Date() } : { reminderJ21At: new Date() },
    });
  }

  async handleExpire(quoteId: string): Promise<void> {
    const row = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    if (!row || !["envoye", "vu"].includes(row.status)) return;
    await this.prisma.quote.update({ where: { id: quoteId }, data: { status: "expire" } });
    await this.audit.record({ action: "quote.expired", target: `quote:${quoteId}` });
  }

  /** Régénère le jeton du parcours (invalide l'ancien lien). */
  async rotateToken(needsAssessmentId: string): Promise<string> {
    const token = generateToken();
    await this.prisma.needsAssessment.update({
      where: { id: needsAssessmentId },
      data: { resumeTokenHash: hashToken(token) },
    });
    return token;
  }

  viewLink(number: string, token: string): string {
    // Construit ici pour éviter d'injecter Env partout ; base identique à webBaseUrl.
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.WEB_ORIGIN ?? "http://localhost:3000").split(",")[0]!;
    return `${base}/devis/${number}?token=${encodeURIComponent(token)}`;
  }
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "entreprise"
  );
}

function randomSuffix(): string {
  return Math.random().toString(16).slice(2, 8);
}
