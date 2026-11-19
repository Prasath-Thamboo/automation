import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { ChannelKeyRotationService } from "./key-rotation.service";
import { SecretBox, seal, singleKey } from "./secret-box";

const k1 = randomBytes(32);
const k2 = randomBytes(32);
const lost = randomBytes(32);

/** Table en mémoire qui imite les filtres Prisma utilisés par le service. */
function table(field: "replyToEnc" | "secretEnc", rows: Array<{ id: string; value: string | null }>) {
  const data = new Map(rows.map((r) => [r.id, r.value]));
  return {
    data,
    findMany: vi.fn(async ({ where, take }: { where: Record<string, never>; take: number }) => {
      const prefix = (where.NOT as unknown as Record<string, { startsWith: string }>)[field]!.startsWith;
      const after = (where.id as { gt?: string } | undefined)?.gt;
      return [...data.entries()]
        .filter(([id, v]) => v !== null && !v.startsWith(prefix) && (!after || id > after))
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, take)
        .map(([id, v]) => ({ id, [field]: v }));
    }),
    updateMany: vi.fn(async ({ where, data: d }: { where: Record<string, string>; data: Record<string, string> }) => {
      if (data.get(where.id!) !== where[field]) return { count: 0 };
      data.set(where.id!, d[field]!);
      return { count: 1 };
    }),
  };
}

function setup() {
  const box = new SecretBox({
    SESSION_SECRET: "x".repeat(32),
    CHANNEL_SECRET_KEY: k2.toString("base64"),
    CHANNEL_SECRET_KEY_VERSION: 2,
    CHANNEL_SECRET_KEY_PREVIOUS: `1:${k1.toString("base64")}`,
  } as never);
  const conversation = table("replyToEnc", [
    { id: "c1", value: seal("+33611111111", singleKey(k1, 1)) },
    { id: "c2", value: box.seal("+33622222222") },
    { id: "c3", value: null },
    { id: "c4", value: seal("perdu@client.fr", singleKey(lost, 7)) },
  ]);
  const channelEndpoint = table("secretEnc", [{ id: "e1", value: seal("jeton-meta", singleKey(k1, 1)) }]);
  const audit = { record: vi.fn() };
  const svc = new ChannelKeyRotationService({ conversation, channelEndpoint } as never, box, audit as never);
  return { svc, box, conversation, channelEndpoint, audit };
}

describe("ChannelKeyRotationService", () => {
  it("rechiffre sous la clé courante ce qui ne l'est pas encore", async () => {
    const { svc, box, conversation, channelEndpoint, audit } = setup();
    const report = await svc.run();

    expect(report).toEqual({ conversations: 1, endpoints: 1, unreadable: 1, done: false });
    expect(conversation.data.get("c1")).toMatch(/^v2\./);
    expect(box.open(conversation.data.get("c1"))).toBe("+33611111111");
    expect(box.open(channelEndpoint.data.get("e1"))).toBe("jeton-meta");
    // Déjà à jour, vide ou illisible : on ne touche à rien.
    expect(conversation.updateMany).toHaveBeenCalledTimes(1);
    expect(conversation.data.get("c4")).toMatch(/^v7\./);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: "channels.key_rotated" }));
  });

  it("est idempotent : un second passage ne rechiffre rien", async () => {
    const { svc, conversation, audit } = setup();
    await svc.run();
    conversation.updateMany.mockClear();
    audit.record.mockClear();
    const again = await svc.run();
    expect(again).toMatchObject({ conversations: 0, endpoints: 0 });
    expect(conversation.updateMany).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it("n'écrase pas une valeur modifiée pendant le passage", async () => {
    const { svc, conversation } = setup();
    conversation.updateMany.mockResolvedValueOnce({ count: 0 });
    const report = await svc.run();
    expect(report.conversations).toBe(0);
  });
});
