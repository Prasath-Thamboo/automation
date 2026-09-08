import { landing } from "@tando/copy";
import { Section } from "@/components/section";
import { Cta } from "@/components/cta";

export function Hero() {
  const { hero } = landing;
  return (
    <Section className="max-w-prose sm:max-w-content">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-ink-900 sm:text-4xl">{hero.title}</h1>
        <p className="mt-5 text-lg text-ink-700">{hero.body}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Cta href="/employes-virtuels">{hero.primaryCta}</Cta>
          <Cta href="/employes-virtuels" variant="secondary">
            {hero.secondaryCta}
          </Cta>
        </div>
        <p className="mt-4 text-sm italic text-ink-500">{hero.note}</p>
      </div>
    </Section>
  );
}
