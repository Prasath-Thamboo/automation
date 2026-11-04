import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { defaultSwitchSchema, type TemplateContent } from "@tando/types";
import { z } from "zod";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { BillingService } from "../billing/billing.service";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";
import { newPublicId } from "./public-id";

const OPEN_SUBSCRIPTION = ["active", "past_due", "paused", "incomplete"] as const;
const defaultSwitchesSchema = z.array(defaultSwitchSchema);

/**
 * Lot 16 — embauche d'un employé « prêt à l'emploi » en libre-service (§5) :
 * abonnement avec essai gratuit + employé créé depuis la fiche publiée du
 * métier, avec les boutons par défaut du métier. Il fonctionne tout de suite
 * via le flux n8n générique du métier (s'il est branché) ou le moteur à règles.
 */
@Injectable()
export class CatalogSubscribeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async subscribe(organizationId: string, slug: string): Promise<{ assistantId: string }> {
    // Idempotent : un second clic renvoie le même employé.
    const existing = await this.prisma.assistant.findFirst({
      where: { organizationId, professionSlug: slug, deletedAt: null },
    });
    if (existing) return { assistantId: existing.id };

    // Un seul contrat par entreprise pour l'instant (facturation et résiliation
    // raisonnent sur « le » contrat de l'organisation).
    const open = await this.prisma.subscription.findFirst({
      where: { organizationId, status: { in: [...OPEN_SUBSCRIPTION] } },
    });
    if (open) {
      throw new ConflictException(
        "Vous avez déjà un contrat en cours. Pour un deuxième employé, posez la question dans « Une question ? » : l'équipe Tando vous prépare une proposition.",
      );
    }

    const profession = await this.prisma.profession.findFirst({
      where: { slug, published: true, deletedAt: null },
      include: { template: { include: { versions: { where: { status: "published" }, take: 1 } } } },
    });
    const content = profession?.template?.versions[0]?.content as TemplateContent | undefined;
    if (!profession || !content) throw new NotFoundException("Ce métier n'est pas disponible.");
    if (profession.monthlyPriceEur <= 0) {
      throw new ConflictException("Ce métier n'a pas encore de tarif. Contactez-nous pour en profiter.");
    }

    const sub = await this.billing.startCatalogSubscription({
      organizationId,
      formula: "pret-a-l-emploi",
      monthlyCents: profession.monthlyPriceEur * 100,
      trialDays: this.env.CATALOG_TRIAL_DAYS,
    });

    const switches = defaultSwitchesSchema.safeParse(profession.defaultSwitches);
    const assistant = await this.prisma.assistant.create({
      data: {
        organizationId,
        subscriptionId: sub.id,
        professionSlug: slug,
        publicId: newPublicId(),
        name: content.assistantName,
        role: content.assistantRole,
        state: "en_formation",
        jobDescription: {
          summary: content.intro,
          tasks: content.canDo,
          limits: content.cannotDo,
          hours: "",
        } as Prisma.InputJsonValue,
        establishment: { name: "", address: "", openingHours: "" },
        contactPrefs: { email: "", phone: "", inbox: "" },
        switches: switches.success
          ? {
              create: switches.data.map((s, position) => ({
                organizationId,
                key: s.key,
                label: s.label,
                help: s.help,
                enabled: s.enabled,
                position,
              })),
            }
          : undefined,
      },
    });

    await this.audit.record({
      organizationId,
      action: "catalog.subscribed",
      target: `assistant:${assistant.id}`,
      metadata: { slug, trialDays: this.env.CATALOG_TRIAL_DAYS },
    });
    return { assistantId: assistant.id };
  }
}
