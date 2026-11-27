import { stub } from "@velekya/copy";
import { Cta } from "@/components/cta";
import { PageHeader } from "@/components/page-header";

/** Page « en construction » : catalogue (Lot 2), questionnaire (Lot 3), contact. */
export function StubPage({ title, body }: { title: string; body: string }) {
  return (
    <PageHeader narrow title={title} intro={body}>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Cta href="/">{stub.backHome}</Cta>
        <a
          href="mailto:bonjour@velekya.fr"
          className="inline-flex min-h-[52px] items-center justify-center rounded-lg border-2 border-primary-900 bg-white px-6 py-3 text-base font-semibold text-primary-900 no-underline transition-colors hover:bg-primary-50"
        >
          bonjour@velekya.fr
        </a>
      </div>
    </PageHeader>
  );
}
