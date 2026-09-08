import type { Metadata } from "next";
import { politiqueConfidentialite } from "@tando/copy";
import { ContentPage, ContentSection } from "@/components/marketing-page";

export const metadata: Metadata = {
  title: politiqueConfidentialite.title,
  description: politiqueConfidentialite.intro,
  alternates: { canonical: "/confidentialite" },
};

export default function ConfidentialitePage() {
  return (
    <ContentPage
      title={politiqueConfidentialite.title}
      intro={politiqueConfidentialite.intro}
      meta={`Dernière mise à jour : ${politiqueConfidentialite.lastUpdated}`}
    >
      {politiqueConfidentialite.sections.map((s) => (
        <ContentSection key={s.heading} heading={s.heading} paragraphs={s.paragraphs} />
      ))}
    </ContentPage>
  );
}
