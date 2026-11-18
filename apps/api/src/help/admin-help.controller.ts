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
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import {
  HELP_REQUEST_STATUSES,
  answerHelpRequestSchema,
  createHelpArticleSchema,
  updateHelpArticleSchema,
  type AdminHelpArticle,
  type AdminHelpArticleList,
  type AdminHelpRequestList,
  type AnswerHelpRequest,
  type CreateHelpArticle,
  type SessionUser,
  type UpdateHelpArticle,
} from "@velekya/types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AdminHelpService } from "./admin-help.service";

/** Lot 15 — base de réponses et questions des clients. */
@ApiTags("admin-help")
@Controller("admin/help")
@UseGuards(AdminGuard)
export class AdminHelpController {
  constructor(private readonly help: AdminHelpService) {}

  @Get("articles")
  articles(): Promise<AdminHelpArticleList> {
    return this.help.listArticles();
  }

  @Post("articles")
  create(
    @Body(new ZodValidationPipe(createHelpArticleSchema)) body: CreateHelpArticle,
    @CurrentUser() user: SessionUser,
  ): Promise<AdminHelpArticle> {
    return this.help.createArticle(body, user.id);
  }

  @Patch("articles/:id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateHelpArticleSchema)) body: UpdateHelpArticle,
    @CurrentUser() user: SessionUser,
  ): Promise<{ ok: true }> {
    return this.help.updateArticle(id, body, user.id);
  }

  @Delete("articles/:id")
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: SessionUser,
  ): Promise<{ ok: true }> {
    return this.help.removeArticle(id, user.id);
  }

  @Get("requests")
  @ApiQuery({ name: "status", required: false, enum: HELP_REQUEST_STATUSES })
  requests(@Query("status") status?: string): Promise<AdminHelpRequestList> {
    return this.help.listRequests(HELP_REQUEST_STATUSES.find((s) => s === status));
  }

  @Post("requests/:id/answer")
  @HttpCode(200)
  answer(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(answerHelpRequestSchema)) body: AnswerHelpRequest,
    @CurrentUser() user: SessionUser,
  ): Promise<{ ok: true }> {
    return this.help.answer(id, body.answer, user.id);
  }
}
