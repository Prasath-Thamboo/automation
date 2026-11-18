import Link from "next/link";
import { landing, nav } from "@velekya/copy";
import { Section, SectionHeading } from "@/components/section";
import { ArrowRight, Hand, Help, Lock, Shield, Users } from "@/components/icons";

const icons = [Shield, Hand, Lock, Help, Users];

export function Reassurance() {
  const { reassurance, eyebrows } = landing;
  return (
    <Section tone="white" labelledBy="rassurance">
      <SectionHeading id="rassurance" eyebrow={eyebrows.reassurance} title={reassurance.title} />
      <dl className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {reassurance.items.map((item, i) => {
          const Icon = icons[i % icons.length] ?? Help;
          return (
            <div key={item.q} className="rounded-lg border border-ink-100 bg-paper p-6">
              <dt className="flex items-start gap-3 font-heading text-xl font-bold text-ink-900">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary-100 text-primary-700">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="pt-1">«&nbsp;{item.q}&nbsp;»</span>
              </dt>
              <dd className="mt-4 text-base text-ink-700">{item.a}</dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-10">
        <Link
          href="/faq"
          className="group inline-flex min-h-[52px] items-center gap-2 rounded-full border-2 border-primary-600 bg-white px-6 text-base font-bold text-primary-700 no-underline transition-colors hover:bg-primary-50"
        >
          {nav.faq}
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Link>
      </p>
    </Section>
  );
}
