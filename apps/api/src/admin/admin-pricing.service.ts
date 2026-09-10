import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  AdminPricingRule,
  AdminPricingRuleList,
  CreatePricingRule,
  UpdatePricingRule,
} from "@tando/types";
import { Prisma, type PricingRule } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

const toEur = (cents: number) => Math.round(cents) / 100;
const toCents = (eur: number) => Math.round(eur * 100);

function toDto(rule: PricingRule): AdminPricingRule {
  return {
    id: rule.id,
    kind: rule.kind,
    key: rule.key,
    label: rule.label,
    setupEur: toEur(rule.setupCents),
    monthlyEur: toEur(rule.monthlyCents),
    factor: rule.factor,
    active: rule.active,
    position: rule.position,
  };
}

/**
 * Édition du barème (`pricing_rules`) sans redéploiement (§4.2, §10). Le moteur
 * de chiffrage (`PricingService`) relit ces règles à chaque devis.
 */
@Injectable()
export class AdminPricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<AdminPricingRuleList> {
    const rules = await this.prisma.pricingRule.findMany({
      orderBy: [{ kind: "asc" }, { position: "asc" }, { label: "asc" }],
    });
    return { rules: rules.map(toDto) };
  }

  async create(dto: CreatePricingRule, actorUserId: string): Promise<AdminPricingRule> {
    const exists = await this.prisma.pricingRule.findUnique({
      where: { kind_key: { kind: dto.kind, key: dto.key } },
    });
    if (exists) {
      throw new ConflictException(`Une règle « ${dto.kind} / ${dto.key} » existe déjà.`);
    }
    const rule = await this.prisma.pricingRule.create({
      data: {
        kind: dto.kind,
        key: dto.key,
        label: dto.label,
        setupCents: toCents(dto.setupEur),
        monthlyCents: toCents(dto.monthlyEur),
        factor: dto.factor,
        active: dto.active,
        position: dto.position,
      },
    });
    await this.audit.record({
      actorUserId,
      action: "admin.pricing_rule_created",
      target: `pricing_rule:${rule.id}`,
      metadata: { kind: rule.kind, key: rule.key },
    });
    return toDto(rule);
  }

  async update(id: string, dto: UpdatePricingRule, actorUserId: string): Promise<AdminPricingRule> {
    await this.mustExist(id);
    const data: Prisma.PricingRuleUpdateInput = {};
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.setupEur !== undefined) data.setupCents = toCents(dto.setupEur);
    if (dto.monthlyEur !== undefined) data.monthlyCents = toCents(dto.monthlyEur);
    if (dto.factor !== undefined) data.factor = dto.factor;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.position !== undefined) data.position = dto.position;

    const rule = await this.prisma.pricingRule.update({ where: { id }, data });
    await this.audit.record({
      actorUserId,
      action: "admin.pricing_rule_updated",
      target: `pricing_rule:${id}`,
      metadata: { kind: rule.kind, key: rule.key },
    });
    return toDto(rule);
  }

  async remove(id: string, actorUserId: string): Promise<{ ok: true }> {
    const rule = await this.mustExist(id);
    await this.prisma.pricingRule.delete({ where: { id } });
    await this.audit.record({
      actorUserId,
      action: "admin.pricing_rule_deleted",
      target: `pricing_rule:${id}`,
      metadata: { kind: rule.kind, key: rule.key },
    });
    return { ok: true };
  }

  private async mustExist(id: string): Promise<PricingRule> {
    const rule = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException("Cette règle de prix n'existe pas.");
    return rule;
  }
}
