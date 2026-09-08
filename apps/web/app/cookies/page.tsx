import type { Metadata } from "next";
import { cookiesCopy } from "@tando/copy";
import { ContentPage, ContentSection } from "@/components/marketing-page";

export const metadata: Metadata = {
  title: cookiesCopy.title,
  description: cookiesCopy.intro,
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <ContentPage title={cookiesCopy.title} intro={cookiesCopy.intro}>
      {cookiesCopy.sections.map((s) => (
        <ContentSection key={s.heading} heading={s.heading} paragraphs={s.paragraphs} />
      ))}
    </ContentPage>
  );
}
