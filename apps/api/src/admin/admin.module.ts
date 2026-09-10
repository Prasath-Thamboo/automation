import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminController } from "./admin.controller";
import { AdminDashboardService } from "./admin-dashboard.service";
import { AdminMissionsController } from "./admin-missions.controller";
import { AdminMissionsService } from "./admin-missions.service";
import { AdminPricingController } from "./admin-pricing.controller";
import { AdminPricingService } from "./admin-pricing.service";
import { AdminClientsController } from "./admin-clients.controller";
import { AdminClientsService } from "./admin-clients.service";

/**
 * Back-office transversal (§10, Lot 10) : tableau de bord, missions, prix,
 * clients. Le catalogue, les devis et les factures gardent leurs propres
 * contrôleurs `admin-*` dans leurs modules respectifs.
 */
@Module({
  imports: [AuthModule],
  controllers: [
    AdminController,
    AdminMissionsController,
    AdminPricingController,
    AdminClientsController,
  ],
  providers: [
    AdminDashboardService,
    AdminMissionsService,
    AdminPricingService,
    AdminClientsService,
  ],
})
export class AdminModule {}
