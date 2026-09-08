import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service";
import type { Env } from "../config/env";

const env = {
  MOBILE_DEEP_LINK_SCHEME: "tando",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  WEB_ORIGIN: ["http://localhost:3000"],
} as unknown as Env;

function makeService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    user: { upsert: vi.fn().mockResolvedValue({ id: "u1", email: "a@b.fr" }) },
    membership: { findFirst: vi.fn().mockResolvedValue({ id: "m1" }) },
    ...(overrides.prisma as object),
  };
  const magicLinks = {
    issue: vi.fn().mockResolvedValue({ token: "tok", expiresAt: new Date(), ttlMinutes: 15 }),
    consume: vi.fn().mockResolvedValue({ userId: "u1", channel: "web" }),
    ...(overrides.magicLinks as object),
  };
  const sessions = {
    issue: vi.fn().mockResolvedValue({ token: "sess", expiresAt: new Date() }),
    resolve: vi.fn().mockResolvedValue({
      id: "u1",
      email: "a@b.fr",
      fullName: null,
      organizationId: "o1",
      organizationName: "Mon entreprise",
      role: "owner",
    }),
    ...(overrides.sessions as object),
  };
  const queue = { enqueueEmail: vi.fn().mockResolvedValue(undefined) };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };

  const service = new AuthService(
    prisma as never,
    magicLinks as never,
    sessions as never,
    queue as never,
    audit as never,
    env,
  );
  return { service, prisma, magicLinks, sessions, queue, audit };
}

describe("AuthService.requestMagicLink", () => {
  it("crée/retrouve l'utilisateur, émet un lien et met l'email en file", async () => {
    const { service, magicLinks, queue, audit } = makeService();
    await service.requestMagicLink({ email: "a@b.fr", channel: "web" }, "127.0.0.1");

    expect(magicLinks.issue).toHaveBeenCalledWith("u1", "web", "127.0.0.1");
    const mail = queue.enqueueEmail.mock.calls[0][0];
    expect(mail.to).toBe("a@b.fr");
    expect(mail.text).toContain("http://localhost:3000/connexion/verifier?token=tok");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.magic_link.requested" }),
    );
  });

  it("construit un lien profond pour le canal mobile", async () => {
    const { service, queue } = makeService();
    await service.requestMagicLink({ email: "a@b.fr", channel: "mobile" });
    expect(queue.enqueueEmail.mock.calls[0][0].text).toContain("tando://verifier?token=tok");
  });
});

describe("AuthService.verify", () => {
  it("refuse un lien inconnu ou expiré", async () => {
    const { service } = makeService({ magicLinks: { consume: vi.fn().mockResolvedValue(null) } });
    await expect(service.verify({ token: "x".repeat(20) })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("ouvre une session et journalise", async () => {
    const { service, sessions, audit } = makeService();
    const result = await service.verify({ token: "x".repeat(20) }, "jest");

    expect(sessions.issue).toHaveBeenCalledWith("u1", "web", "jest");
    expect(result.user.organizationId).toBe("o1");
    expect(result.sessionToken).toBe("sess");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.session.created", organizationId: "o1" }),
    );
  });

  it("crée une organisation si l'utilisateur n'en a pas", async () => {
    const create = vi.fn().mockResolvedValue({ id: "o2" });
    const { service } = makeService({
      prisma: {
        user: {
          upsert: vi.fn(),
          findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "u1", email: "a@b.fr" }),
        },
        membership: { findFirst: vi.fn().mockResolvedValue(null) },
        organization: { create },
      },
    });

    await service.verify({ token: "x".repeat(20) });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ memberships: { create: { userId: "u1", role: "owner" } } }),
      }),
    );
  });
});
