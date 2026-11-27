import { landing } from "@velekya/copy";
import { Section } from "@/components/section";
import { Cta } from "@/components/cta";
import { Check } from "@/components/icons";

export function FinalCta() {
  const { finalCta } = landing;
  return (
    <Section>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 px-6 py-16 text-center shadow-lift sm:px-12 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary-500/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl"
        />
        <div className="relative">
          <h2 className="mx-auto max-w-3xl text-3xl text-white sm:text-4xl">{finalCta.title}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-primary-50 sm:text-xl">{finalCta.body}</p>
          <div className="mt-10 flex flex-col items-center gap-4">
            <Cta href="/employes-virtuels" variant="primary" size="lg" arrow>
              {finalCta.cta}
            </Cta>
            <p className="flex items-center gap-2 text-base text-primary-100">
              <Check className="h-5 w-5" />
              {finalCta.note}
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
