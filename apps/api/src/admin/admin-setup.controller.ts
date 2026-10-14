import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  createSwitchSchema,
  updateSwitchSchema,
  updateWorkflowSchema,
  type AdminAssistantSetup,
  type CreateSwitch,
  type SessionUser,
  type UpdateSwitch,
  type UpdateWorkflow,
} from "@tando/types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AdminSetupService } from "./admin-setup.service";

/** Lot 14 — flux n8n et boutons de pilotage d'un employé. */
@ApiTags("admin-setup")
@Controller("admin")
@UseGuards(AdminGuard)
export class AdminSetupController {
  constructor(private readonly setup: AdminSetupService) {}

  @Get("assistants/:id/setup")
  get(@Param("id", ParseUUIDPipe) id: string): Promise<AdminAssistantSetup> {
    return this.setup.get(id);
  }

  @Patch("assistants/:id/setup")
  setWorkflow(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateWorkflowSchema)) body: UpdateWorkflow,
  ): Promise<AdminAssistantSetup> {
    return this.setup.setWorkflow(id, body, user.id);
  }

  @Post("assistants/:id/switches")
  createSwitch(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(createSwitchSchema)) body: CreateSwitch,
  ): Promise<AdminAssistantSetup> {
    return this.setup.createSwitch(id, body, user.id);
  }

  @Patch("switches/:id")
  updateSwitch(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateSwitchSchema)) body: UpdateSwitch,
  ): Promise<AdminAssistantSetup> {
    return this.setup.updateSwitch(id, body, user.id);
  }

  @Delete("switches/:id")
  removeSwitch(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AdminAssistantSetup> {
    return this.setup.removeSwitch(id, user.id);
  }
}
