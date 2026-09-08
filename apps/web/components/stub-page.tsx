import { stub } from "@tando/copy";
import { Cta } from "@/components/cta";

/** Page « en construction » : catalogue (Lot 2), questionnaire (Lot 3), contact. */
export function StubPage({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-prose px-4 py-20 sm:px-6 sm:py-28">
      <h1 className="text-3xl font-bold text-ink-900 sm:text-4xl">{title}</h1>
      <p className="mt-5 text-lg text-ink-700">{body}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Cta href="/">{stub.backHome}</Cta>
        <a
          href="mailto:bonjour@tando.fr"
          className="inline-flex min-h-touch items-center justify-center rounded-md border border-primary-600 px-6 py-3 text-base font-semibold text-primary-700 no-underline hover:bg-primary-50"
        >
          bonjour@tando.fr
        </a>
      </div>
    </div>
  );
}
