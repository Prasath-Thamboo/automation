import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { BillingService } from "../billing/billing.service";

interface TemplateContentShape {
  assistantName?: string;
  assistantRole?: string;
  intro?: string;
  canDo?: string[];
}

/** Souscription à un employé virtuel prêt à l'emploi (§5) : abonnement + assistant. */
@Injectable()
export class CatalogSubscribeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly audit: AuditService,
  ) {}

  async subscribe(organizationId: string, slug: string): Promise<{ assistantId: string }> {
    const existing = await this.prisma.assistant.findFirst({
      where: { organizationId, professionSlug: slug, deletedAt: null },
    });
    if (existing) return { assistantId: existing.id };

    const profession = await this.prisma.profession.findFirst({
      where: { slug, published: true, deletedAt: null },
      include: { template: { include: { versions: { where: { status: "published" }, take: 1 } } } },
    });
    const content = profession?.template?.versions[0]?.content as TemplateContentShape | undefined;
    if (!profession || !content) {
      throw new NotFoundException("Ce métier n'est pas disponible.");
    }
    if (profession.monthlyPriceEur <= 0) {
      throw new ConflictException("Ce métier n'a pas de tarif : contactez-nous.");
    }

    const sub = await this.billing.startCatalogSubscription({
      organizationId,
      formula: "pret-a-l-emploi",
      monthlyCents: profession.monthlyPriceEur * 100,
      trialDays: profession.trialDays,
    });

    const assistant = await this.prisma.assistant.create({
      data: {
        organizationId,
        subscriptionId: sub.id,
        professionSlug: slug,
        name: content.assistantName ?? profession.name,
        role: content.assistantRole ?? `votre assistant ${profession.name.toLowerCase()}`,
        state: "en_formation",
        jobDescription: {
          summary: content.intro ?? "",
          tasks: content.canDo ?? [],
          hours: "",
        } as Prisma.InputJsonValue,
        establishment: { name: "", address: "", openingHours: "" },
        contactPrefs: { email: "", phone: "", inbox: "" },
      },
    });

    await this.audit.record({
      organizationId,
      action: "catalog.subscribed",
      target: `assistant:${assistant.id}`,
      metadata: { slug },
    });
    return { assistantId: assistant.id };
  }
}
