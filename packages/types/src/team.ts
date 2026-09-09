import { z } from "zod";
import type { SubscriptionSummary } from "./billing";
import { subscriptionSummarySchema } from "./billing";
import type { AppointmentRow } from "./runtime";
import { appointmentRowSchema } from "./runtime";

/**
 * Espace client « Mon équipe » (§6) et mise en service « premier jour » (§5.2).
 * Vocabulaire client (§2) : on décrit un collaborateur — il travaille, il rend
 * des comptes, on le forme, on le met en pause.
 */

export type AssistantState = "en_formation" | "au_travail" | "en_pause";
export type OnboardingStatus = "en_cours" | "termine";
export type EscalationStatus = "ouverte" | "repondue";
export type ConversationChannel =
  | "telephone"
  | "whatsapp"
  | "email"
  | "instagram"
  | "formulaire"
  | "surplace"
  | "autre";
export type MessageAuthor = "client" | "assistant" | "patron";

export interface EstablishmentInfo {
  name: string;
  address: string;
  openingHours: string;
}

export interface ContactPrefs {
  email: string;
  phone: string;
  inbox: string;
}

export interface AssistantCard {
  id: string;
  name: string;
  role: string;
  state: AssistantState;
  professionSlug: string | null;
  onboarding: OnboardingStatus;
  onboardingStep: number;
}

export interface Instruction {
  version: number;
  text: string;
  active: boolean;
  createdAt: string;
}

export interface LogbookEntry {
  id: string;
  channel: ConversationChannel;
  customerLabel: string;
  summary: string;
  lastMessageAt: string;
}

export interface ConversationMessage {
  author: MessageAuthor;
  text: string;
  at: string;
}

export interface ConversationDetail {
  id: string;
  channel: ConversationChannel;
  customerLabel: string;
  messages: ConversationMessage[];
}

export interface EscalationItem {
  id: string;
  question: string;
  context: string | null;
  status: EscalationStatus;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
}

/** Question de personnalisation propre au métier (issue du modèle de catalogue). */
export interface SpecificQuestion {
  key: string;
  label: string;
  type: "text" | "textarea" | "boolean" | "choice";
  options: string[];
  required: boolean;
}

export interface AssistantDetail extends AssistantCard {
  summary: string;
  tasks: string[];
  hours: string;
  establishment: EstablishmentInfo;
  contactPrefs: ContactPrefs;
  specifics: Record<string, string>;
  specificQuestions: SpecificQuestion[];
  instructions: Instruction[];
  logbook: LogbookEntry[];
  escalations: EscalationItem[];
  appointments: AppointmentRow[];
  todayCount: number;
  weekCount: number;
}

export interface TeamList {
  assistants: AssistantCard[];
}

export interface AccountMember {
  email: string;
  fullName: string | null;
  role: string;
}

export interface AccountInfo {
  email: string;
  fullName: string | null;
  organizationName: string;
  role: string;
  members: AccountMember[];
  subscription: SubscriptionSummary | null;
}

// ── Schémas ───────────────────────────────────────────────────────────────

const stateEnum = z.enum(["en_formation", "au_travail", "en_pause"]);
const onboardingEnum = z.enum(["en_cours", "termine"]);
const channelEnum = z.enum([
  "telephone",
  "whatsapp",
  "email",
  "instagram",
  "formulaire",
  "surplace",
  "autre",
]);
const escalationEnum = z.enum(["ouverte", "repondue"]);

const establishmentSchema: z.ZodType<EstablishmentInfo> = z.object({
  name: z.string(),
  address: z.string(),
  openingHours: z.string(),
});
const contactPrefsSchema: z.ZodType<ContactPrefs> = z.object({
  email: z.string(),
  phone: z.string(),
  inbox: z.string(),
});
const instructionSchema: z.ZodType<Instruction> = z.object({
  version: z.number().int(),
  text: z.string(),
  active: z.boolean(),
  createdAt: z.string(),
});
const logbookEntrySchema: z.ZodType<LogbookEntry> = z.object({
  id: z.string(),
  channel: channelEnum,
  customerLabel: z.string(),
  summary: z.string(),
  lastMessageAt: z.string(),
});
export const escalationItemSchema: z.ZodType<EscalationItem> = z.object({
  id: z.string().uuid(),
  question: z.string(),
  context: z.string().nullable(),
  status: escalationEnum,
  answer: z.string().nullable(),
  answeredAt: z.string().nullable(),
  createdAt: z.string(),
});
const specificQuestionSchema: z.ZodType<SpecificQuestion> = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "textarea", "boolean", "choice"]),
  options: z.array(z.string()),
  required: z.boolean(),
});

const assistantCardShape = {
  id: z.string().uuid(),
  name: z.string(),
  role: z.string(),
  state: stateEnum,
  professionSlug: z.string().nullable(),
  onboarding: onboardingEnum,
  onboardingStep: z.number().int(),
};

export const assistantCardSchema: z.ZodType<AssistantCard> = z.object(assistantCardShape);

export const teamListSchema: z.ZodType<TeamList> = z.object({
  assistants: z.array(assistantCardSchema),
});

export const assistantDetailSchema: z.ZodType<AssistantDetail> = z.object({
  ...assistantCardShape,
  summary: z.string(),
  tasks: z.array(z.string()),
  hours: z.string(),
  establishment: establishmentSchema,
  contactPrefs: contactPrefsSchema,
  specifics: z.record(z.string(), z.string()) as z.ZodType<Record<string, string>>,
  specificQuestions: z.array(specificQuestionSchema),
  instructions: z.array(instructionSchema),
  logbook: z.array(logbookEntrySchema),
  escalations: z.array(escalationItemSchema),
  appointments: z.array(appointmentRowSchema),
  todayCount: z.number().int(),
  weekCount: z.number().int(),
});

export const conversationDetailSchema: z.ZodType<ConversationDetail> = z.object({
  id: z.string().uuid(),
  channel: channelEnum,
  customerLabel: z.string(),
  messages: z.array(
    z.object({
      author: z.enum(["client", "assistant", "patron"]),
      text: z.string(),
      at: z.string(),
    }),
  ),
});

export const accountInfoSchema: z.ZodType<AccountInfo> = z.object({
  email: z.string(),
  fullName: z.string().nullable(),
  organizationName: z.string(),
  role: z.string(),
  members: z.array(
    z.object({ email: z.string(), fullName: z.string().nullable(), role: z.string() }),
  ),
  subscription: subscriptionSummarySchema.nullable(),
});

// requests

export const onboardingStepSchema = z.object({
  step: z.number().int().min(0).max(4),
  establishment: z
    .object({
      name: z.string().trim().max(200),
      address: z.string().trim().max(300),
      openingHours: z.string().trim().max(500),
    })
    .partial()
    .optional(),
  specifics: z.record(z.string(), z.string().trim().max(2000)).optional(),
  contactPrefs: z
    .object({
      email: z.string().trim().max(200),
      phone: z.string().trim().max(40),
      inbox: z.string().trim().max(200),
    })
    .partial()
    .optional(),
});
export type OnboardingStep = z.infer<typeof onboardingStepSchema>;

export const addInstructionSchema = z.object({
  text: z.string().trim().min(3).max(1000),
});
export type AddInstruction = z.infer<typeof addInstructionSchema>;

export const answerEscalationSchema = z.object({
  answer: z.string().trim().min(1).max(2000),
});
export type AnswerEscalation = z.infer<typeof answerEscalationSchema>;

export const subscribeCatalogSchema = z.object({
  slug: z.string().trim().min(1).max(80),
});
export type SubscribeCatalog = z.infer<typeof subscribeCatalogSchema>;

export const updateAccountSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
});
export type UpdateAccount = z.infer<typeof updateAccountSchema>;
