import { Injectable } from "@nestjs/common";
import type { PricingRule } from "@prisma/client";
import type { AssessmentAnswers, QuoteLine } from "@tando/types";
import { PrismaService } from "../../prisma/prisma.service";
import { pricingRuleSeeds } from "./default-rules";

export interface PricingResult {
  formula: string;
  setupCents: number;
  monthlyCents: number;
  lines: QuoteLine[];
  volumeFactor: number;
}

const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
/** Arrondi à l'euro supérieur. */
const roundEuro = (cents: number): number => Math.ceil(cents / 100) * 100;
const toEur = (cents: number): number => Math.round(cents) / 100;

/**
 * Moteur de chiffrage (§4.2). Configurable en base (`pricing_rules`) : socle par
 * formule + modules par tâche + coefficient de volume + coût de connexion par
 * outil + facteur de complexité ajusté à la main par l'admin.
 */
@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Charge le barème actif. Le sème si la table est vide (premier démarrage). */
  async loadRules(): Promise<PricingRule[]> {
    const rules = await this.prisma.pricingRule.findMany({ where: { active: true } });
    if (rules.length > 0) return rules;

    await this.prisma.pricingRule.createMany({ data: pricingRuleSeeds });
    return this.prisma.pricingRule.findMany({ where: { active: true } });
  }

  /** Formule suggérée à partir des réponses. */
  suggestFormula(answers: AssessmentAnswers): "sur-mesure" | "sur-mesure-plus" {
    const manyTasks = arr(answers.taches).length >= 5;
    const bigVolume = str(answers.volume) === "500+";
    const bigTeam = str(answers.taille) === "15+";
    return manyTasks || bigVolume || bigTeam ? "sur-mesure-plus" : "sur-mesure";
  }

  compute(
    answers: AssessmentAnswers,
    formula: string,
    rules: PricingRule[],
    complexityFactor: number,
  ): PricingResult {
    const by = (kind: string, key: string) =>
      rules.find((r) => r.kind === kind && r.key === key);

    const lines: QuoteLine[] = [];

    const socle = by("socle", formula) ?? by("socle", "sur-mesure");
    let setup = socle?.setupCents ?? 0;
    let monthly = socle?.monthlyCents ?? 0;
    if (socle) {
      lines.push({
        kind: "socle",
        label: socle.label,
        setupEur: toEur(socle.setupCents),
        monthlyEur: toEur(socle.monthlyCents),
      });
    }

    for (const taskKey of arr(answers.taches)) {
      const rule = by("module", taskKey);
      if (!rule) continue;
      const lineMonthly = rule.monthlyCents * rule.factor;
      setup += rule.setupCents;
      monthly += lineMonthly;
      lines.push({
        kind: "module",
        label: rule.label,
        setupEur: toEur(rule.setupCents),
        monthlyEur: toEur(lineMonthly),
      });
    }

    const toolKeys = new Set<string>();
    const agenda = str(answers.agenda);
    if (agenda && agenda !== "aucun") toolKeys.add(agenda);
    for (const o of arr(answers.autresOutils)) if (o !== "rien") toolKeys.add(o);
    for (const key of toolKeys) {
      const rule = by("outil", key);
      if (!rule || (rule.setupCents === 0 && rule.monthlyCents === 0)) continue;
      setup += rule.setupCents;
      monthly += rule.monthlyCents;
      lines.push({
        kind: "outil",
        label: rule.label,
        setupEur: toEur(rule.setupCents),
        monthlyEur: toEur(rule.monthlyCents),
      });
    }

    const volumeRule = by("volume", str(answers.volume));
    const volumeFactor = volumeRule?.factor ?? 1;
    monthly *= volumeFactor;

    setup *= complexityFactor;
    monthly *= complexityFactor;

    return {
      formula: socle ? formula : "sur-mesure",
      setupCents: roundEuro(setup),
      monthlyCents: roundEuro(monthly),
      lines,
      volumeFactor,
    };
  }
}
