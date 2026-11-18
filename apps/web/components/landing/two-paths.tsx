import { landing } from "@velekya/copy";
import { Section } from "@/components/section";
import { Cta } from "@/components/cta";
import { Pencil, Users } from "@/components/icons";

export function TwoPaths() {
  const { ready, custom } = landing.twoPaths;
  return (
    <Section>
      <p className="eyebrow">{landing.eyebrows.twoPaths}</p>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <article className="flex flex-col rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 p-8 text-white shadow-lift sm:p-10">
          <span className="grid h-14 w-14 place-items-center rounded-md bg-white/15">
            <Users className="h-7 w-7" />
          </span>
          <h2 className="mt-6 text-2xl text-white">{ready.title}</h2>
          <p className="mt-4 flex-1 text-lg text-primary-50">{ready.body}</p>
          <Cta href="/employes-virtuels" variant="light" arrow className="mt-8 self-start">
            {ready.cta}
          </Cta>
        </article>
        <article className="flex flex-col rounded-xl border border-ink-100 bg-white p-8 shadow-card sm:p-10">
          <span className="grid h-14 w-14 place-items-center rounded-md bg-accent-100 text-accent-600">
            <Pencil className="h-7 w-7" />
          </span>
          <h2 className="mt-6 text-2xl text-ink-900">{custom.title}</h2>
          <p className="mt-4 flex-1 text-lg text-ink-700">{custom.body}</p>
          <Cta href="/questionnaire" variant="secondary" arrow className="mt-8 self-start">
            {custom.cta}
          </Cta>
        </article>
      </div>
    </Section>
  );
}
