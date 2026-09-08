import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Client Prisma partagé. Une seule instance pour tout le processus.
 * L'isolation par organisation ne se fait PAS ici requête par requête : voir
 * `forOrganization()` dans `tenant.ts`, utilisé par les services métier.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger("Prisma");

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log("Connecté à la base de données");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
