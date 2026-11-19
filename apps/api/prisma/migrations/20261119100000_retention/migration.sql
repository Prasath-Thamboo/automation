-- Lot 18 — durées de conservation : marque des comptes supprimés déjà purgés.
ALTER TABLE "organizations" ADD COLUMN "purgedAt" TIMESTAMPTZ(6);
