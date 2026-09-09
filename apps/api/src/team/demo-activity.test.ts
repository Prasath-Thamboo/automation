import { describe, expect, it, vi } from "vitest";
import { seedDemoActivity } from "./demo-activity";

function fakePrisma(existingConversations: number) {
  const created: unknown[] = [];
  return {
    _created: created,
    conversation: {
      count: vi.fn().mockResolvedValue(existingConversations),
      create: vi.fn(async ({ data }: { data: unknown }) => {
        created.push(data);
        return { id: `conv-${created.length}` };
      }),
    },
    message: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    escalation: { create: vi.fn().mockResolvedValue({ id: "esc-1" }) },
  };
}

describe("seedDemoActivity", () => {
  it("crée des conversations et une escalade ouverte à la première activation", async () => {
    const prisma = fakePrisma(0);
    await seedDemoActivity(prisma as never, { id: "a1", organizationId: "o1", name: "Léa" });

    expect(prisma.conversation.create).toHaveBeenCalledTimes(3);
    expect(prisma.message.createMany).toHaveBeenCalledTimes(3);
    expect(prisma.escalation.create).toHaveBeenCalledTimes(1);
    expect(prisma.escalation.create.mock.calls[0]![0].data.status).toBe("ouverte");
  });

  it("ne fait rien si de l'activité existe déjà (idempotent)", async () => {
    const prisma = fakePrisma(5);
    await seedDemoActivity(prisma as never, { id: "a1", organizationId: "o1", name: "Léa" });
    expect(prisma.conversation.create).not.toHaveBeenCalled();
    expect(prisma.escalation.create).not.toHaveBeenCalled();
  });
});
