import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { AdminDashboard } from "@tando/types";
import { AdminGuard } from "../auth/admin.guard";
import { AdminDashboardService } from "./admin-dashboard.service";

@ApiTags("admin")
@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly dashboard: AdminDashboardService) {}

  @Get("dashboard")
  @ApiOkResponse({ description: "Tableau de bord d'activité (agrégats, sans donnée personnelle)." })
  summary(): Promise<AdminDashboard> {
    return this.dashboard.summary();
  }
}
