/**
 * Génère les visuels de l'application mobile depuis les SVG de la charte
 * (charte v2.0 §3 et §7 : « icône avec le symbole sur fond bleu nuit »).
 *
 *   node brand/generate-app-icons.mjs
 *
 * Rendu par le Chromium de Playwright (déjà installé pour les e2e) : aucune
 * dépendance ajoutée. Sorties dans apps/mobile/assets/.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const require = createRequire(resolve(root, "e2e/package.json"));
const { chromium } = require("@playwright/test");

const NAVY = "#0F1F2E";
const BORDEAUX = "#9E1F3F";
const WHITE = "#FFFFFF";

/** V + point + arc (repère 512), couleurs paramétrables. */
const mark = ({ v = WHITE, dot = BORDEAUX, arc = true } = {}) => `
  <polygon points="118,150 162,150 256,318 350,150 394,150 256,392" fill="${v}"/>
  ${arc ? `<circle cx="394" cy="130" r="52" fill="none" stroke="${dot}" stroke-width="5" stroke-linecap="round" stroke-dasharray="262 64" transform="rotate(-90 394 130)"/>` : ""}
  <circle cx="394" cy="130" r="20" fill="${dot}"/>`;

/** Contenu centré et réduit à `scale` (zones de sécurité des icônes). */
const centered = (inner, scale) =>
  `<g transform="translate(${256 - 256 * scale},${256 - 256 * scale}) scale(${scale})">${inner}</g>`;

const svg = (body, bg = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bg}${body}</svg>`;

const assets = [
  // iOS / Expo : carré plein bord, sans transparence (le système arrondit).
  { file: "icon.png", size: 1024, svg: svg(mark(), `<rect width="512" height="512" fill="${NAVY}"/>`) },
  // Android adaptive : premier plan transparent dans la zone sûre (≈ 66 %),
  // fond bleu nuit déclaré dans app.json.
  { file: "adaptive-icon.png", size: 1024, svg: svg(centered(mark(), 0.62)) },
  // Écran de lancement : posé sur le bleu nuit (app.json → splash.backgroundColor).
  { file: "splash-icon.png", size: 512, svg: svg(mark()) },
  // Notification Android : silhouette blanche sur transparent, sans arc (< 32 px utile).
  { file: "notification-icon.png", size: 96, svg: svg(centered(mark({ dot: WHITE, arc: false }), 0.9)) },
  // Favicon (version web d'Expo) : symbole petit format.
  {
    file: "favicon.png",
    size: 48,
    svg: svg(mark({ arc: false }), `<rect width="512" height="512" rx="120" fill="${NAVY}"/>`),
  },
];

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const a of assets) {
    await page.setViewportSize({ width: a.size, height: a.size });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${a.svg.replace("<svg ", `<svg width="${a.size}" height="${a.size}" `)}</body></html>`,
    );
    const out = resolve(root, "apps/mobile/assets", a.file);
    await page.locator("svg").screenshot({ path: out, omitBackground: true });
    console.log(`✓ ${a.file} (${a.size}×${a.size})`);
  }
} finally {
  await browser.close();
}
