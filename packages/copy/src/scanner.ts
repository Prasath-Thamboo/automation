/**
 * Extraction du texte "humain" d'un fichier TypeScript/TSX : littéraux de chaîne,
 * gabarits et texte JSX. On ignore les identifiants, imports et noms de modules
 * pour éviter les faux positifs (ex. `NEXT_PUBLIC_API_URL`).
 *
 * Sert au test de la liste noire (§2 / §11).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import ts from "typescript";

export interface ScannedString {
  file: string;
  line: number;
  text: string;
}

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".turbo",
  "dist",
  "build",
  "coverage",
]);

/** Liste récursive des fichiers .ts/.tsx sous `root`. */
export function listSourceFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) walk(join(dir, entry.name));
        continue;
      }
      const ext = extname(entry.name);
      if (ext === ".ts" || ext === ".tsx") out.push(join(dir, entry.name));
    }
  };
  if (safeIsDir(root)) walk(root);
  return out;
}

function safeIsDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** Extrait les chaînes humaines d'un fichier. */
export function extractHumanStrings(file: string): ScannedString[] {
  const source = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const results: ScannedString[] = [];

  const push = (node: ts.Node, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    results.push({ file, line: line + 1, text: trimmed });
  };

  /**
   * Vrai si la chaîne est du "code" et non du texte destiné à l'humain :
   * argument d'un appel de fonction (`searchParams.get("token")`), clé d'accès
   * (`obj["token"]`), ou nom de propriété. Ces chaînes ne sont jamais affichées
   * telles quelles au client — les libellés visibles vivent dans `@tando/copy`
   * ou dans du texte JSX.
   */
  const isCodeLiteral = (node: ts.Node): boolean => {
    const parent = node.parent;
    if (!parent) return false;
    if (
      (ts.isCallExpression(parent) || ts.isNewExpression(parent)) &&
      parent.arguments?.some((arg) => arg === node)
    ) {
      return true;
    }
    if (ts.isElementAccessExpression(parent) && parent.argumentExpression === node) {
      return true;
    }
    if (
      (ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent)) &&
      parent.name === node
    ) {
      return true;
    }
    return false;
  };

  const visit = (node: ts.Node) => {
    // Ignore les chemins de modules : import ... from "x", export ... from "x", import("x")
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier
    ) {
      ts.forEachChild(node, (child) => {
        if (child !== node.moduleSpecifier) visit(child);
      });
      return;
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      return;
    }

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isCodeLiteral(node)) push(node, node.text);
    } else if (ts.isTemplateExpression(node)) {
      if (!isCodeLiteral(node)) {
        push(node, node.head.text);
        for (const span of node.templateSpans) push(span, span.literal.text);
      }
    } else if (ts.isJsxText(node)) {
      push(node, node.text);
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return results;
}

/** Scanne toutes les racines fournies et renvoie les chaînes humaines trouvées. */
export function scanRoots(
  roots: string[],
  options: { excludeFiles?: (file: string) => boolean } = {},
): ScannedString[] {
  const exclude = options.excludeFiles ?? (() => false);
  const out: ScannedString[] = [];
  for (const root of roots) {
    for (const file of listSourceFiles(root)) {
      if (exclude(file)) continue;
      out.push(...extractHumanStrings(file));
    }
  }
  return out;
}
