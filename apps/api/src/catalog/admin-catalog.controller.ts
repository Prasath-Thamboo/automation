import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  createProfessionSchema,
  templateContentSchema,
  updateProfessionSchema,
  type AdminProfession,
  type AdminProfessionList,
  type CreateProfession,
  type TemplateContent,
  type UpdateProfession,
} from "@tando/types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { SessionUser } from "@tando/types";
import { AdminCatalogService } from "./admin-catalog.service";

@ApiTags("admin-catalog")
@Controller("admin/catalog/professions")
@UseGuards(AdminGuard)
export class AdminCatalogController {
  constructor(private readonly catalog: AdminCatalogService) {}

  @Get()
  @ApiOkResponse({ description: "Tous les métiers (publiés et brouillons)." })
  list(): Promise<AdminProfessionList> {
    return this.catalog.list();
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string): Promise<AdminProfession> {
    return this.catalog.get(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createProfessionSchema)) body: CreateProfession,
    @CurrentUser() user: SessionUser,
  ): Promise<AdminProfession> {
    return this.catalog.create(body, user.id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateProfessionSchema)) body: UpdateProfession,
    @CurrentUser() user: SessionUser,
  ): Promise<AdminProfession> {
    return this.catalog.update(id, body, user.id);
  }

  @Put(":id/template")
  saveDraft(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(templateContentSchema)) body: TemplateContent,
    @CurrentUser() user: SessionUser,
  ): Promise<AdminProfession> {
    return this.catalog.saveDraft(id, body, user.id);
  }

  @Post(":id/template/publish")
  @HttpCode(200)
  publish(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: SessionUser,
  ): Promise<AdminProfession> {
    return this.catalog.publish(id, user.id);
  }

  @Delete(":id")
  @HttpCode(200)
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: SessionUser,
  ): Promise<{ ok: true }> {
    await this.catalog.remove(id, user.id);
    return { ok: true };
  }
}
