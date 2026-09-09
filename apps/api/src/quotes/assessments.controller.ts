import { Body, Controller, Get, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  patchAssessmentSchema,
  startAssessmentSchema,
  submitAssessmentSchema,
  type AssessmentState,
  type JobDescriptionContent,
  type PatchAssessment,
  type StartAssessment,
  type SubmitAssessment,
} from "@tando/types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AssessmentGuard, type AssessmentRequest } from "./assessment.guard";
import { AssessmentsService } from "./assessments.service";

@ApiTags("assessments")
@Controller("assessments")
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOkResponse({ description: "Démarre un questionnaire ; renvoie le jeton de reprise." })
  async start(
    @Body(new ZodValidationPipe(startAssessmentSchema)) body: StartAssessment,
  ): Promise<{ state: AssessmentState; resumeToken: string }> {
    return this.assessments.start(body.email);
  }

  @Get("current")
  @UseGuards(AssessmentGuard)
  @ApiOkResponse({ description: "État du questionnaire (réponses, étape, fiche de poste)." })
  current(@Req() req: AssessmentRequest): Promise<AssessmentState> {
    return this.assessments.state(req.assessment!.id);
  }

  @Patch("current")
  @UseGuards(AssessmentGuard)
  save(
    @Req() req: AssessmentRequest,
    @Body(new ZodValidationPipe(patchAssessmentSchema)) body: PatchAssessment,
  ): Promise<AssessmentState> {
    return this.assessments.patch(req.assessment!, body);
  }

  @Get("current/preview")
  @UseGuards(AssessmentGuard)
  @ApiOkResponse({ description: "Fiche de poste proposée, non enregistrée." })
  preview(@Req() req: AssessmentRequest): JobDescriptionContent {
    return this.assessments.preview(req.assessment!);
  }

  @Post("current/submit")
  @UseGuards(AssessmentGuard)
  submit(
    @Req() req: AssessmentRequest,
    @Body(new ZodValidationPipe(submitAssessmentSchema)) body: SubmitAssessment,
  ): Promise<AssessmentState> {
    return this.assessments.submit(req.assessment!, body.jobDescription);
  }
}
