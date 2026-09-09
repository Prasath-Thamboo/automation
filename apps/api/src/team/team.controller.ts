import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import {
  addInstructionSchema,
  answerEscalationSchema,
  onboardingStepSchema,
  simulateSchema,
  subscribeCatalogSchema,
  updateAccountSchema,
  type AccountInfo,
  type AddInstruction,
  type AnswerEscalation,
  type AssistantDetail,
  type ConversationDetail,
  type EscalationItem,
  type OnboardingStep,
  type RuntimeTurn,
  type SessionUser,
  type Simulate,
  type SubscribeCatalog,
  type TeamList,
  type UpdateAccount,
} from "@tando/types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { RuntimeService } from "../assistants/runtime.service";
import { AssistantService } from "./assistant.service";
import { EscalationsService } from "./escalations.service";
import { CatalogSubscribeService } from "./catalog-subscribe.service";
import { AccountService } from "./account.service";

@ApiTags("team")
@Controller("me")
@UseGuards(SessionGuard)
export class TeamController {
  constructor(
    private readonly assistants: AssistantService,
    private readonly escalations: EscalationsService,
    private readonly catalog: CatalogSubscribeService,
    private readonly account: AccountService,
    private readonly runtime: RuntimeService,
  ) {}

  @Get("team")
  @ApiOkResponse({ description: "Les employés virtuels de l'organisation et leur état." })
  team(@CurrentUser() user: SessionUser): Promise<TeamList> {
    return this.assistants.team(user.organizationId);
  }

  @Get("assistants/:id")
  detail(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AssistantDetail> {
    return this.assistants.detail(user.organizationId, id);
  }

  @Get("assistants/:id/conversations/:cid")
  conversation(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("cid", ParseUUIDPipe) cid: string,
  ): Promise<ConversationDetail> {
    return this.assistants.conversation(user.organizationId, id, cid);
  }

  @Post("assistants/:id/onboarding")
  onboarding(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(onboardingStepSchema)) body: OnboardingStep,
  ): Promise<AssistantDetail> {
    return this.assistants.saveOnboarding(user.organizationId, id, body);
  }

  @Post("assistants/:id/activate")
  activate(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AssistantDetail> {
    return this.assistants.activate(user.organizationId, id);
  }

  @Post("assistants/:id/instructions")
  addInstruction(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(addInstructionSchema)) body: AddInstruction,
  ): Promise<AssistantDetail> {
    return this.assistants.addInstruction(user.organizationId, id, body, user.id);
  }

  @Post("assistants/:id/simulate")
  @ApiOkResponse({ description: "Teste l'assistant (essai depuis l'espace client)." })
  simulate(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(simulateSchema)) body: Simulate,
  ): Promise<RuntimeTurn> {
    return this.runtime.simulate(user.organizationId, id, body.text, body.sessionId);
  }

  @Post("assistants/:id/pause")
  pause(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AssistantDetail> {
    return this.assistants.pause(user.organizationId, id);
  }

  @Post("assistants/:id/resume")
  resume(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AssistantDetail> {
    return this.assistants.resume(user.organizationId, id);
  }

  @Post("escalations/:id/answer")
  answer(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(answerEscalationSchema)) body: AnswerEscalation,
  ): Promise<EscalationItem> {
    return this.escalations.answer(user.organizationId, id, body, user.id);
  }

  @Post("catalog/subscribe")
  subscribe(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(subscribeCatalogSchema)) body: SubscribeCatalog,
  ): Promise<{ assistantId: string }> {
    return this.catalog.subscribe(user.organizationId, body.slug);
  }

  @Get("account")
  accountInfo(@CurrentUser() user: SessionUser): Promise<AccountInfo> {
    return this.account.info(user);
  }

  @Patch("account")
  updateAccount(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(updateAccountSchema)) body: UpdateAccount,
  ): Promise<AccountInfo> {
    return this.account.updateProfile(user, body);
  }

  @Post("account/cancel-subscription")
  cancelSubscription(@CurrentUser() user: SessionUser): Promise<AccountInfo> {
    return this.account.cancelSubscription(user);
  }

  @Get("account/export")
  @Header("content-type", "application/json; charset=utf-8")
  @Header("content-disposition", 'attachment; filename="mes-donnees-tando.json"')
  async exportData(@CurrentUser() user: SessionUser, @Res() res: Response): Promise<void> {
    const data = await this.account.exportData(user);
    res.status(200).send(JSON.stringify(data, null, 2));
  }

  @Post("account/delete")
  deleteAccount(@CurrentUser() user: SessionUser): Promise<{ ok: true }> {
    return this.account.deleteAccount(user);
  }
}
