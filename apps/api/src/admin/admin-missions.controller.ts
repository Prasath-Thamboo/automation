import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import {
  updateMissionSchema,
  type AdminMissionDetail,
  type AdminMissionList,
  type SessionUser,
  type UpdateMission,
} from "@tando/types";
import type { MissionStatus } from "@prisma/client";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AdminMissionsService } from "./admin-missions.service";

const MISSION_STATUSES: MissionStatus[] = ["a_preparer", "en_preparation", "en_service", "annulee"];

@ApiTags("admin-missions")
@Controller("admin/missions")
@UseGuards(AdminGuard)
export class AdminMissionsController {
  constructor(private readonly missions: AdminMissionsService) {}

  @Get()
  @ApiQuery({ name: "status", required: false })
  @ApiOkResponse({ description: "Missions de mise en service, de la plus récente à la plus ancienne." })
  list(@Query("status") status?: string): Promise<AdminMissionList> {
    const filter = MISSION_STATUSES.find((s) => s === status);
    return this.missions.list(filter);
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string): Promise<AdminMissionDetail> {
    return this.missions.get(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateMissionSchema)) body: UpdateMission,
    @CurrentUser() user: SessionUser,
  ): Promise<AdminMissionDetail> {
    return this.missions.update(id, body, user.id);
  }
}
