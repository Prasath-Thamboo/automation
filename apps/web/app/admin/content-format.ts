import type { TemplateContent } from "@tando/api-client";

/**
 * Conversion entre le formulaire du back-office (champs simples + zones de texte
 * ligne à ligne) et l'objet `TemplateContent`. La validation de fond est faite
 * par l'API (schéma Zod partagé) : ici on se contente de mettre en forme.
 *
 * Back-office = vocabulaire technique autorisé (§2).
 */

const lines = (s: FormDataEntryValue | null): string[] =>
  String(s ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

const num = (s: FormDataEntryValue | null, fallback = 0): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
};

function splitPipe(line: string): string[] {
  return line.split("|").map((p) => p.trim());
}

export function formToTemplateContent(f: FormData): TemplateContent {
  return {
    assistantName: String(f.get("assistantName") ?? "").trim(),
    assistantRole: String(f.get("assistantRole") ?? "").trim(),
    intro: String(f.get("intro") ?? "").trim(),
    dayTimeline: lines(f.get("dayTimeline")).map((l) => {
      const [time, ...rest] = splitPipe(l);
      return { time: time ?? "", text: rest.join(" | ") };
    }),
    canDo: lines(f.get("canDo")),
    cannotDo: lines(f.get("cannotDo")),
    demo: {
      intro: String(f.get("demoIntro") ?? "").trim(),
      messages: lines(f.get("demoMessages")).map((l) => {
        const [from, ...rest] = splitPipe(l);
        return {
          from: from === "assistant" ? "assistant" : "client",
          text: rest.join(" | "),
        };
      }),
    },
    savings: {
      sliderA: {
        label: String(f.get("sliderALabel") ?? "").trim(),
        min: num(f.get("sliderAMin")),
        max: num(f.get("sliderAMax"), 1),
        default: num(f.get("sliderADefault")),
        minutesEach: num(f.get("sliderAMinutes")),
      },
      sliderB: {
        label: String(f.get("sliderBLabel") ?? "").trim(),
        min: num(f.get("sliderBMin")),
        max: num(f.get("sliderBMax"), 1),
        default: num(f.get("sliderBDefault")),
        minutesEach: num(f.get("sliderBMinutes")),
      },
      daysPerMonth: num(f.get("daysPerMonth"), 22),
      note: String(f.get("savingsNote") ?? "").trim(),
    },
    contract: {
      included: lines(f.get("included")),
      cancellation: String(f.get("cancellation") ?? "").trim(),
    },
    personalization: lines(f.get("personalization")).map((l) => {
      const [key, label, type, opts, required] = splitPipe(l);
      return {
        key: key ?? "",
        label: label ?? "",
        type: (["text", "textarea", "boolean", "choice"].includes(type ?? "")
          ? type
          : "text") as TemplateContent["personalization"][number]["type"],
        options: opts ? opts.split(";").map((o) => o.trim()).filter(Boolean) : undefined,
        required: required === "*" || required === "true",
      };
    }),
  };
}

/** Objet -> valeurs de formulaire, pour pré-remplir l'éditeur. */
export function templateContentToForm(c: TemplateContent | null) {
  return {
    assistantName: c?.assistantName ?? "",
    assistantRole: c?.assistantRole ?? "",
    intro: c?.intro ?? "",
    dayTimeline: (c?.dayTimeline ?? []).map((m) => `${m.time} | ${m.text}`).join("\n"),
    canDo: (c?.canDo ?? []).join("\n"),
    cannotDo: (c?.cannotDo ?? []).join("\n"),
    demoIntro: c?.demo.intro ?? "",
    demoMessages: (c?.demo.messages ?? []).map((m) => `${m.from} | ${m.text}`).join("\n"),
    sliderALabel: c?.savings.sliderA.label ?? "",
    sliderAMin: c?.savings.sliderA.min ?? 0,
    sliderAMax: c?.savings.sliderA.max ?? 50,
    sliderADefault: c?.savings.sliderA.default ?? 10,
    sliderAMinutes: c?.savings.sliderA.minutesEach ?? 2,
    sliderBLabel: c?.savings.sliderB.label ?? "",
    sliderBMin: c?.savings.sliderB.min ?? 0,
    sliderBMax: c?.savings.sliderB.max ?? 50,
    sliderBDefault: c?.savings.sliderB.default ?? 10,
    sliderBMinutes: c?.savings.sliderB.minutesEach ?? 2,
    daysPerMonth: c?.savings.daysPerMonth ?? 22,
    savingsNote: c?.savings.note ?? "",
    included: (c?.contract.included ?? []).join("\n"),
    cancellation: c?.contract.cancellation ?? "",
    personalization: (c?.personalization ?? [])
      .map(
        (p) =>
          `${p.key} | ${p.label} | ${p.type} | ${(p.options ?? []).join(";")} | ${p.required ? "*" : ""}`,
      )
      .join("\n"),
  };
}

export type EditorValues = ReturnType<typeof templateContentToForm>;
