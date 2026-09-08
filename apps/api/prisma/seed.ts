/**
 * Seed de développement.
 * - Compte de démonstration (organisation cliente + propriétaire).
 * - Compte du personnel Tando (rôle admin, accès back-office).
 * - Catalogue : les 6 métiers du MVP, publiés (§5 / §10 Lot 2).
 * Idempotent (upsert).
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { catalogSeed } from "./seed-data/catalog";

const prisma = new PrismaClient();

async function seedAccounts() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Boulangerie de la Place", slug: "demo" },
  });

  const owner = await prisma.user.upsert({
    where: { email: "patron@demo.tando.local" },
    update: {},
    create: { email: "patron@demo.tando.local", fullName: "Camille Roy" },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: owner.id, organizationId: org.id } },
    update: {},
    create: { userId: owner.id, organizationId: org.id, role: "owner" },
  });

  // Personnel Tando : une organisation interne + un membre `admin`.
  const staffOrg = await prisma.organization.upsert({
    where: { slug: "tando-staff" },
    update: {},
    create: { name: "Tando", slug: "tando-staff" },
  });
  const staff = await prisma.user.upsert({
    where: { email: "staff@tando.fr" },
    update: {},
    create: { email: "staff@tando.fr", fullName: "Équipe Tando" },
  });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: staff.id, organizationId: staffOrg.id } },
    update: { role: "admin" },
    create: { userId: staff.id, organizationId: staffOrg.id, role: "admin" },
  });

  console.warn("Comptes :");
  console.warn(`  propriétaire  ${owner.email}  (organisation « ${org.name} »)`);
  console.warn(`  admin Tando   ${staff.email}`);
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

async function main() {
  await seedAccounts();
  await seedCatalog();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
