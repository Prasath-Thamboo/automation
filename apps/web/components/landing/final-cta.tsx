import { landing } from "@tando/copy";
import { Section } from "@/components/section";
import { Cta } from "@/components/cta";

export function FinalCta() {
  const { finalCta } = landing;
  return (
    <Section>
      <div className="rounded-lg bg-primary-700 px-6 py-12 text-center sm:px-12">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">{finalCta.title}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-50">{finalCta.body}</p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Cta
            href="/employes-virtuels"
            className="!bg-white !text-primary-700 hover:!bg-primary-50"
          >
            {finalCta.cta}
          </Cta>
          <p className="text-sm italic text-primary-50">{finalCta.note}</p>
        </div>
      </div>
    </Section>
  );
}
