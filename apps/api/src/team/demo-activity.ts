import type { Prisma } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";

/**
 * Génère une activité de démonstration à l'activation d'un assistant, pour que
 * « son carnet de bord » et « à valider » ne soient pas vides. Le moteur réel
 * (`AssistantRuntime`, Lot 6) remplacera cette génération.
 */
export async function seedDemoActivity(
  prisma: PrismaService,
  assistant: { id: string; organizationId: string; name: string },
): Promise<void> {
  const already = await prisma.conversation.count({ where: { assistantId: assistant.id } });
  if (already > 0) return;

  const now = Date.now();
  const h = (n: number) => new Date(now - n * 3_600_000);

  const conversations: Array<{
    channel: Prisma.ConversationCreateManyInput["channel"];
    customerLabel: string;
    summary: string;
    at: number;
    messages: Array<{ author: "client" | "assistant"; text: string }>;
  }> = [
    {
      channel: "telephone",
      customerLabel: "Un client",
      summary: "Il a pris un rendez-vous pour jeudi 14h et l'a mis dans votre agenda.",
      at: 2,
      messages: [
        { author: "client", text: "Bonjour, je voudrais un rendez-vous cette semaine." },
        { author: "assistant", text: "Bonjour ! Je peux vous proposer jeudi 14h. Cela vous convient ?" },
        { author: "client", text: "Parfait." },
        { author: "assistant", text: "C'est noté pour jeudi 14h. Vous recevrez un rappel la veille." },
      ],
    },
    {
      channel: "email",
      customerLabel: "Camille R.",
      summary: "Elle a demandé vos horaires du week-end ; il a répondu.",
      at: 5,
      messages: [
        { author: "client", text: "Vous êtes ouverts samedi ?" },
        { author: "assistant", text: "Oui, le samedi de 9h à 17h. À bientôt !" },
      ],
    },
    {
      channel: "instagram",
      customerLabel: "Un client",
      summary: "Il a transmis une demande de devis pour la semaine prochaine.",
      at: 20,
      messages: [
        { author: "client", text: "Vous pouvez me faire un devis ?" },
        { author: "assistant", text: "Bien sûr. Je transmets votre demande, on vous recontacte très vite." },
      ],
    },
  ];

  for (const c of conversations) {
    const conv = await prisma.conversation.create({
      data: {
        assistantId: assistant.id,
        organizationId: assistant.organizationId,
        channel: c.channel,
        customerLabel: c.customerLabel,
        summary: c.summary,
        startedAt: h(c.at + 1),
        lastMessageAt: h(c.at),
      },
    });
    await prisma.message.createMany({
      data: c.messages.map((m, i) => ({
        conversationId: conv.id,
        author: m.author,
        text: m.text,
        createdAt: new Date(h(c.at).getTime() + i * 30_000),
      })),
    });
  }

  await prisma.escalation.create({
    data: {
      assistantId: assistant.id,
      organizationId: assistant.organizationId,
      question: "Un client demande s'il peut être remboursé après un rendez-vous manqué.",
      context: "Reçu par téléphone il y a 1 h. L'assistant n'a pas de consigne sur les remboursements.",
      status: "ouverte",
      createdAt: h(1),
    },
  });
}
