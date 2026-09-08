/**
 * Seed de développement — Lot 0.
 * Crée un compte de démonstration pour pouvoir tester la connexion par lien magique
 * sans repartir d'une base vide. Idempotent (upsert).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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

  // Compte du personnel Tando (accès back-office, aucune organisation cliente).
  await prisma.user.upsert({
    where: { email: "staff@tando.fr" },
    update: {},
    create: { email: "staff@tando.fr", fullName: "Équipe Tando" },
  });

  console.warn("Seed terminé :");
  console.warn(`  organisation « ${org.name} » (slug: ${org.slug})`);
  console.warn(`  propriétaire  ${owner.email}`);
  console.warn(`  staff Tando   staff@tando.fr`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
