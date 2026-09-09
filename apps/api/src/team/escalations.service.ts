import { Injectable, NotFoundException } from "@nestjs/common";
import type { AnswerEscalation, EscalationItem } from "@tando/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class EscalationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Le patron répond à une demande remontée ; l'assistant reprend la main (§6). */
  async answer(
    organizationId: string,
    id: string,
    dto: AnswerEscalation,
    userId: string,
  ): Promise<EscalationItem> {
    const esc = await this.prisma.escalation.findFirst({ where: { id, organizationId } });
    if (!esc) throw new NotFoundException("Cette demande n'existe pas.");

    const updated = await this.prisma.escalation.update({
      where: { id },
      data: {
        answer: dto.answer,
        status: "repondue",
        answeredByUserId: userId,
        answeredAt: new Date(),
      },
    });

    if (esc.conversationId) {
      await this.prisma.message.create({
        data: { conversationId: esc.conversationId, author: "patron", text: dto.answer },
      });
    }

    await this.audit.record({
      organizationId,
      actorUserId: userId,
      action: "escalation.answered",
      target: `escalation:${id}`,
    });

    return {
      id: updated.id,
      question: updated.question,
      context: updated.context,
      status: "repondue",
      answer: updated.answer,
      answeredAt: updated.answeredAt ? updated.answeredAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
