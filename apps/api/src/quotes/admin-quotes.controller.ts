import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  updateQuoteSchema,
  type AdminQuote,
  type AdminQuoteList,
  type SessionUser,
  type UpdateQuote,
} from "@tando/types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AdminQuotesService } from "./admin-quotes.service";

@ApiTags("admin-quotes")
@Controller("admin/quotes")
@UseGuards(AdminGuard)
export class AdminQuotesController {
  constructor(private readonly quotes: AdminQuotesService) {}

  @Get()
  @ApiOkResponse({ description: "Tous les devis, du plus récent au plus ancien." })
  list(): Promise<AdminQuoteList> {
    return this.quotes.list();
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string): Promise<AdminQuote> {
    return this.quotes.get(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateQuoteSchema)) body: UpdateQuote,
    @CurrentUser() user: SessionUser,
  ): Promise<AdminQuote> {
    return this.quotes.update(id, body, user.id);
  }

  @Post(":id/send")
  @HttpCode(200)
  send(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: SessionUser,
  ): Promise<AdminQuote> {
    return this.quotes.send(id, user.id);
  }
}
