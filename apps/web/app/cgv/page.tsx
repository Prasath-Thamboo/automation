import type { Metadata } from "next";
import { conditionsGenerales } from "@tando/copy";
import { ContentPage, ContentSection } from "@/components/marketing-page";

export const metadata: Metadata = {
  title: conditionsGenerales.title,
  description: conditionsGenerales.intro,
  alternates: { canonical: "/cgv" },
};

export default function CgvPage() {
  return (
    <ContentPage
      title={conditionsGenerales.title}
      intro={conditionsGenerales.intro}
      meta={`Dernière mise à jour : ${conditionsGenerales.lastUpdated}`}
    >
      {conditionsGenerales.sections.map((s) => (
        <ContentSection key={s.heading} heading={s.heading} paragraphs={s.paragraphs} />
      ))}
    </ContentPage>
  );
}
