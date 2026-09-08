/**
 * Critère d'acceptation §11 : « Ajoute un test automatisé qui échoue si un terme
 * de la liste noire apparaît dans `packages/copy` ou dans le JSX de `apps/web`. »
 *
 * On extrait les chaînes réellement destinées à l'humain (littéraux, gabarits,
 * texte JSX) et on vérifie qu'aucun terme interdit n'y figure.
 */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { findJargon } from "./blacklist";
import { scanRoots } from "./scanner";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const roots = [
  resolve(repoRoot, "packages/copy/src"),
  resolve(repoRoot, "apps/web/app"),
  resolve(repoRoot, "apps/web/components"),
  resolve(repoRoot, "apps/web/lib"),
];

/** Fichiers qui *définissent* la liste noire — ils contiennent les termes par nature. */
const isSelfReferential = (file: string) =>
  /[\\/]blacklist\.(ts|test\.ts)$/.test(file) || /[\\/]scanner\.ts$/.test(file);

describe("liste noire de jargon (§2)", () => {
  const strings = scanRoots(roots, { excludeFiles: isSelfReferential });

  it("scanne effectivement des fichiers", () => {
    expect(strings.length).toBeGreaterThan(0);
  });

  it("aucun terme interdit dans les textes clients", () => {
    const offenders = strings
      .flatMap((s) =>
        findJargon(s.text).map((hit) => ({
          location: `${s.file}:${s.line}`,
          term: hit.term,
          excerpt: hit.excerpt,
        })),
      )
      .filter(Boolean);

    if (offenders.length > 0) {
      const report = offenders
        .map((o) => `  • « ${o.term} » — ${o.location}\n    …${o.excerpt}…`)
        .join("\n");
      throw new Error(
        `Jargon interdit détecté dans une interface cliente :\n${report}\n` +
          `Voir le glossaire : packages/copy/src/glossary.ts`,
      );
    }
    expect(offenders).toHaveLength(0);
  });
});
