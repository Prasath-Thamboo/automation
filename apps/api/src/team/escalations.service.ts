import { Injectable, NotFoundException } from "@nestjs/common";
import type { AnswerEscalation, EscalationItem } from "@velekya/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { QueueService } from "../queue/queue.module";

@Injectable()
export class EscalationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly queue: QueueService,
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
      // Lot 12 — la réponse du patron repart vers le client par son canal.
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: esc.conversationId },
        select: { endpointId: true, replyToEnc: true },
      });
      const deliverable = Boolean(conversation?.endpointId && conversation.replyToEnc);
      const msg = await this.prisma.message.create({
        data: {
          conversationId: esc.conversationId,
          author: "patron",
          text: dto.answer,
          delivery: deliverable ? "en_attente" : null,
        },
      });
      if (deliverable) await this.queue.enqueueChannelOut(msg.id);
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
