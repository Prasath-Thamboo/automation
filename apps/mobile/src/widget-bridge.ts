import { requireOptionalNativeModule } from "expo";
import type { TeamList } from "@tando/api-client";
import { mobileWidget as wx } from "@tando/copy";
import { writeJson } from "./store";

/**
 * Pont vers le widget d'écran d'accueil (§6bis, point 6). L'app écrit l'état de
 * l'équipe dans un conteneur partagé, lu par la cible native :
 *   - iOS : App Group `group.fr.tando.app` → `UserDefaults(suiteName:)`
 *   - Android : `SharedPreferences` du package, lues par le `GlanceAppWidget`
 *
 * Le conteneur partagé n'existe que dans un build EAS incluant la cible native
 * (module `TandoWidgetBridge`, ajouté avec `@bacons/apple-targets` au 1er build
 * du Lot 9). En son absence (Expo Go, tests, bundle headless),
 * `requireOptionalNativeModule` renvoie `null` : on se rabat sur un cache local,
 * sans effet visible mais sans erreur.
 */

export interface WidgetSnapshot {
  /** Résumé d'état affiché sur le widget. */
  label: string;
  /** `true` si au moins un employé est au travail. */
  working: boolean;
  updatedAt: string;
}

const SHARED_KEY = "tando.widget.snapshot";
const APP_GROUP = "group.fr.tando.app";

interface WidgetBridgeModule {
  set(group: string, key: string, value: string): void;
}

const native = requireOptionalNativeModule<WidgetBridgeModule>("TandoWidgetBridge");

export function snapshotFromTeam(team: TeamList): WidgetSnapshot {
  const active = team.assistants.filter((a) => a.onboarding === "termine");
  const working = active.some((a) => a.state === "au_travail");
  const label = active.length === 0 ? wx.paused : working ? wx.working : wx.paused;
  return { label, working, updatedAt: new Date().toISOString() };
}

/** Publie l'état de l'équipe vers le widget. Toujours sûr à appeler. */
export async function syncWidget(team: TeamList): Promise<void> {
  const snapshot = snapshotFromTeam(team);
  try {
    native?.set(APP_GROUP, SHARED_KEY, JSON.stringify(snapshot));
  } catch {
    // Le widget est un confort : un échec d'écriture n'est jamais bloquant.
  }
  await writeJson(SHARED_KEY, snapshot);
}
