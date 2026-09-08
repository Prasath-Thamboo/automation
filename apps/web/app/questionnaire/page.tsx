import type { Metadata } from "next";
import { stub } from "@tando/copy";
import { StubPage } from "@/components/stub-page";

export const metadata: Metadata = {
  title: "Décrire mon besoin",
  description: stub.questionnaire.body,
  alternates: { canonical: "/questionnaire" },
  robots: { index: false, follow: true },
};

export default function QuestionnairePage() {
  return <StubPage title={stub.questionnaire.title} body={stub.questionnaire.body} />;
}
