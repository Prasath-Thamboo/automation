import { theme as tokens } from "@tando/ui-native";

/** Raccourcis de style pour l'app mobile, dérivés des tokens partagés. */
export const t = {
  color: tokens.color,
  space: tokens.space,
  radius: tokens.radius,
  fontSize: tokens.fontSize,
} as const;

export const styles = {
  screen: { flex: 1, backgroundColor: t.color.paper } as const,
  card: {
    backgroundColor: t.color.white,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: "#e7e3da",
    padding: t.space[4],
  } as const,
  h1: { fontSize: t.fontSize["2xl"], fontWeight: "700", color: t.color.ink } as const,
  h2: { fontSize: t.fontSize.lg, fontWeight: "700", color: t.color.ink } as const,
  body: { fontSize: t.fontSize.base, color: t.color.inkSoft, lineHeight: 24 } as const,
  muted: { fontSize: t.fontSize.sm, color: t.color.inkFaint } as const,
  primaryBtn: {
    minHeight: 52,
    borderRadius: t.radius.md,
    backgroundColor: t.color.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: t.space[6],
  } as const,
  primaryBtnText: { color: "#fff", fontSize: t.fontSize.lg, fontWeight: "600" } as const,
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#a8a296",
    borderRadius: t.radius.md,
    paddingHorizontal: t.space[3],
    fontSize: t.fontSize.base,
    backgroundColor: "#fff",
    color: t.color.ink,
  } as const,
};
