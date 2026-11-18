import type { HelpAction } from "@velekya/api-client";
import { helpCopy } from "@velekya/copy";

/** Où mène chaque renvoi sur le web. Pas de réglage des notifications ici
 *  (il vit dans l'application mobile) : pas de lien. */
const HREF: Partial<Record<HelpAction, string>> = {
  equipe: "/mon-equipe",
  documents: "/mon-equipe/documents",
  compte: "/mon-equipe/compte",
  carnet: "/mon-equipe",
};

export function helpLink(action: HelpAction): { href: string; label: string } | null {
  const href = HREF[action];
  if (!href || action === "aucune") return null;
  return { href, label: helpCopy.actions[action] };
}
