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
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  createPricingRuleSchema,
  updatePricingRuleSchema,
  type AdminPricingRule,
  type AdminPricingRuleList,
  type CreatePricingRule,
  type SessionUser,
  type UpdatePricingRule,
} from "@tando/types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AdminPricingService } from "./admin-pricing.service";

@ApiTags("admin-pricing")
@Controller("admin/pricing-rules")
@UseGuards(AdminGuard)
export class AdminPricingController {
  constructor(private readonly pricing: AdminPricingService) {}

  @Get()
  @ApiOkResponse({ description: "Barème complet (toutes les règles, actives ou non)." })
  list(): Promise<AdminPricingRuleList> {
    return this.pricing.list();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createPricingRuleSchema)) body: CreatePricingRule,
    @CurrentUser() user: SessionUser,
  ): Promise<AdminPricingRule> {
    return this.pricing.create(body, user.id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePricingRuleSchema)) body: UpdatePricingRule,
    @CurrentUser() user: SessionUser,
  ): Promise<AdminPricingRule> {
    return this.pricing.update(id, body, user.id);
  }

  @Delete(":id")
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: SessionUser,
  ): Promise<{ ok: true }> {
    return this.pricing.remove(id, user.id);
  }
}
