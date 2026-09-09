import type { Metadata } from "next";
import { QuestionnaireClient } from "./questionnaire-client";

export const metadata: Metadata = {
  title: "Décrire mon besoin",
  description:
    "Décrivez votre besoin en quelques minutes et recevez un devis clair, sans jargon et sans engagement.",
  alternates: { canonical: "/questionnaire" },
  robots: { index: true, follow: true },
};

export default function QuestionnairePage() {
  return (
    <div className="mx-auto max-w-content px-4 py-14 sm:px-6 sm:py-20">
      <QuestionnaireClient />
    </div>
  );
}
