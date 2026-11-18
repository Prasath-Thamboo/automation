/**
 * Seed de développement.
 * - Compte de démonstration (organisation cliente + propriétaire).
 * - Compte du personnel Velekya (rôle admin, accès back-office).
 * - Catalogue : les 6 métiers du MVP, publiés (§5 / §10 Lot 2).
 * Idempotent (upsert).
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { catalogSeed } from "./seed-data/catalog";
import { helpSeed } from "./seed-data/help";
import { pricingRuleSeeds } from "../src/quotes/pricing/default-rules";

const prisma = new PrismaClient();

async function seedAccounts() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Boulangerie de la Place", slug: "demo" },
  });

  const owner = await prisma.user.upsert({
    where: { email: "patron@demo.velekya.local" },
    update: {},
    create: { email: "patron@demo.velekya.local", fullName: "Camille Roy" },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: owner.id, organizationId: org.id } },
    update: {},
    create: { userId: owner.id, organizationId: org.id, role: "owner" },
  });

  // Personnel Velekya : une organisation interne + un membre `admin`.
  const staffOrg = await prisma.organization.upsert({
    where: { slug: "velekya-staff" },
    update: {},
    create: { name: "Velekya", slug: "velekya-staff" },
  });
  const staff = await prisma.user.upsert({
    where: { email: "staff@velekya.fr" },
    update: {},
    create: { email: "staff@velekya.fr", fullName: "Équipe Velekya" },
  });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: staff.id, organizationId: staffOrg.id } },
    update: { role: "admin" },
    create: { userId: staff.id, organizationId: staffOrg.id, role: "admin" },
  });

  console.warn("Comptes :");
  console.warn(`  propriétaire  ${owner.email}  (organisation « ${org.name} »)`);
  console.warn(`  admin Velekya   ${staff.email}`);
}

/** Boutons par défaut du métier, s'il en déclare (Lot 16). */
function switchesOf(item: (typeof catalogSeed)[number]) {
  return item.defaultSwitches
    ? { defaultSwitches: item.defaultSwitches as unknown as Prisma.InputJsonValue }
    : {};
}

async function seedCatalog() {
  for (const item of catalogSeed) {
    const profession = await prisma.profession.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        sector: item.sector,
        benefit: item.benefit,
        needs: item.needs,
        monthlyPriceEur: item.monthlyPriceEur,
        position: item.position,
        published: true,
        ...switchesOf(item),
      },
      create: {
        slug: item.slug,
        name: item.name,
        sector: item.sector,
        benefit: item.benefit,
        needs: item.needs,
        monthlyPriceEur: item.monthlyPriceEur,
        position: item.position,
        published: true,
        ...switchesOf(item),
        template: { create: {} },
      },
      include: { template: { include: { versions: true } } },
    });

    const templateId = profession.template!.id;
    const content = item.content as unknown as Prisma.InputJsonValue;
    const existingPublished = profession.template!.versions.find((v) => v.status === "published");

    if (existingPublished) {
      await prisma.assistantTemplateVersion.update({
        where: { id: existingPublished.id },
        data: { content },
      });
    } else {
      await prisma.assistantTemplateVersion.create({
        data: {
          templateId,
          version: 1,
          status: "published",
          publishedAt: new Date(),
          content,
        },
      });
    }
  }
  console.warn(`Catalogue : ${catalogSeed.length} métiers publiés.`);
}

async function seedPricing() {
  for (const rule of pricingRuleSeeds) {
    await prisma.pricingRule.upsert({
      where: { kind_key: { kind: rule.kind, key: rule.key } },
      update: {
        label: rule.label,
        setupCents: rule.setupCents,
        monthlyCents: rule.monthlyCents,
        factor: rule.factor,
        position: rule.position,
        active: true,
      },
      create: rule,
    });
  }
  console.warn(`Barème de chiffrage : ${pricingRuleSeeds.length} règles.`);
}

async function seedHelp() {
  for (const { slug, ...article } of helpSeed) {
    await prisma.helpArticle.upsert({
      where: { slug },
      update: article,
      create: { slug, ...article },
    });
  }
  console.warn(`Aide « Une question ? » : ${helpSeed.length} réponses.`);
}

async function main() {
  await seedAccounts();
  await seedCatalog();
  await seedPricing();
  await seedHelp();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
