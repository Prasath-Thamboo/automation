import { landing } from "@velekya/copy";
import { Cta } from "@/components/cta";
import { Check, Clock } from "@/components/icons";

export function Hero() {
  const { hero, heroVisual } = landing;
  return (
    <section className="bg-glow overflow-hidden">
      <div className="mx-auto grid max-w-content items-center gap-14 px-4 pb-20 pt-12 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-8 lg:pb-28">
        <div className="animate-fade-up">
          <p className="eyebrow">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-primary-500" />
            {hero.eyebrow}
          </p>
          <h1 className="mt-5 text-4xl text-ink-950 sm:text-5xl">{hero.title}</h1>
          <p className="mt-6 max-w-xl text-lg text-ink-700 sm:text-xl sm:leading-relaxed">
            {hero.body}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Cta href="/employes-virtuels" size="lg" arrow className="sm:whitespace-nowrap">
              {hero.primaryCta}
            </Cta>
            <Cta href="/employes-virtuels" size="lg" variant="secondary" className="sm:whitespace-nowrap">
              {hero.secondaryCta}
            </Cta>
          </div>
          <p className="mt-5 flex items-center gap-2 text-base text-ink-700">
            <Check className="h-5 w-5 shrink-0 text-primary-600" />
            {hero.note}
          </p>
        </div>

        {/* Illustration : un exemple de journée. Décorative mais lisible. */}
        <figure
          className="relative mx-auto w-full max-w-md animate-fade-up [animation-delay:150ms]"
        >
          <div
            aria-hidden
            className="absolute -inset-4 -z-0 rotate-3 rounded-2xl bg-gradient-to-br from-primary-200 via-primary-100 to-accent-100"
          />
          <div className="relative rounded-xl border border-ink-100 bg-white p-6 shadow-lift sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <p className="font-heading text-xl font-bold text-ink-900">{heroVisual.title}</p>
              <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-primary-50 px-3 py-1 text-sm font-bold text-primary-700">
                <span aria-hidden className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-500 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary-500" />
                </span>
                {heroVisual.status}
              </span>
            </div>
            <ol className="mt-6 space-y-3">
              {heroVisual.items.map((item) => (
                <li
                  key={item.time}
                  className="flex items-start gap-4 rounded-md bg-ink-50 p-4"
                >
                  <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-sm font-bold tabular-nums text-ink-700 shadow-soft">
                    <Clock className="h-4 w-4" />
                    {item.time}
                  </span>
                  <span className="text-base text-ink-900">{item.text}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 flex items-center gap-2 border-t border-ink-100 pt-5 text-base font-semibold text-primary-700">
              <Check className="h-5 w-5 shrink-0" />
              {heroVisual.footer}
            </p>
          </div>
          <figcaption className="sr-only">{heroVisual.label}</figcaption>
        </figure>
      </div>
    </section>
  );
}
