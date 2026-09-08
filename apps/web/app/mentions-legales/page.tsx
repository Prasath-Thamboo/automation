import type { Metadata } from "next";
import { mentionsLegales } from "@tando/copy";
import { ContentPage, ContentSection } from "@/components/marketing-page";

export const metadata: Metadata = {
  title: mentionsLegales.title,
  description: mentionsLegales.intro,
  alternates: { canonical: "/mentions-legales" },
  robots: { index: true, follow: true },
};

export default function MentionsLegalesPage() {
  return (
    <ContentPage
      title={mentionsLegales.title}
      intro={mentionsLegales.intro}
      meta={`Dernière mise à jour : ${mentionsLegales.lastUpdated}`}
    >
      {mentionsLegales.sections.map((s) => (
        <ContentSection key={s.heading} heading={s.heading} paragraphs={s.paragraphs} />
      ))}
    </ContentPage>
  );
}
