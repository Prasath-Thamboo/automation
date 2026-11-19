import type { Env } from "../config/env";

const DAY_MS = 86_400_000;

/** Durées de conservation, en jours (§9.4). `activity = 0` : pas de purge d'activité. */
export interface RetentionPolicy {
  magicLink: number;
  session: number;
  assessment: number;
  prospect: number;
  webhook: number;
  pushToken: number;
  deletedAccount: number;
  activity: number;
}

export type RetentionCutoffs = { [K in keyof RetentionPolicy]: Date | null };

export function policyFromEnv(env: Env): RetentionPolicy {
  return {
    magicLink: env.RETENTION_MAGIC_LINK_DAYS,
    session: env.RETENTION_SESSION_DAYS,
    assessment: env.RETENTION_ASSESSMENT_DAYS,
    prospect: env.RETENTION_PROSPECT_DAYS,
    webhook: env.RETENTION_WEBHOOK_DAYS,
    pushToken: env.RETENTION_PUSH_TOKEN_DAYS,
    deletedAccount: env.RETENTION_DELETED_ACCOUNT_DAYS,
    activity: env.RETENTION_ACTIVITY_DAYS,
  };
}

/** Date avant laquelle une donnée est purgée, ou `null` si la catégorie est conservée. */
export function retentionCutoffs(policy: RetentionPolicy, now: Date): RetentionCutoffs {
  const out = {} as RetentionCutoffs;
  for (const key of Object.keys(policy) as (keyof RetentionPolicy)[]) {
    const days = policy[key];
    out[key] = days > 0 ? new Date(now.getTime() - days * DAY_MS) : null;
  }
  return out;
}

/** Adresse de remplacement d'un utilisateur effacé (unique, non routable). */
export function anonymizedEmail(userId: string): string {
  return `supprime-${userId}@invalid.velekya`;
}
