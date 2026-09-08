import { landing } from "@tando/copy";
import { Section } from "@/components/section";
import { Cta } from "@/components/cta";

export function TwoPaths() {
  const { ready, custom } = landing.twoPaths;
  return (
    <Section>
      <div className="grid gap-8 sm:grid-cols-2">
        <article className="flex flex-col rounded-lg border border-primary-600 bg-primary-50 p-6">
          <h2 className="text-xl font-bold text-ink-900">{ready.title}</h2>
          <p className="mt-3 flex-1 text-base text-ink-700">{ready.body}</p>
          <Cta href="/employes-virtuels" className="mt-6 self-start">
            {ready.cta}
          </Cta>
        </article>
        <article className="flex flex-col rounded-lg border border-ink-100 bg-white p-6">
          <h2 className="text-xl font-bold text-ink-900">{custom.title}</h2>
          <p className="mt-3 flex-1 text-base text-ink-700">{custom.body}</p>
          <Cta href="/questionnaire" variant="secondary" className="mt-6 self-start">
            {custom.cta}
          </Cta>
        </article>
      </div>
    </Section>
  );
}
