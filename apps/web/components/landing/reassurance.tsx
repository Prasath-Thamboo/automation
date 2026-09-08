import Link from "next/link";
import { landing, nav } from "@tando/copy";
import { Section } from "@/components/section";

export function Reassurance() {
  const { reassurance } = landing;
  return (
    <Section muted>
      <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">{reassurance.title}</h2>
      <dl className="mt-8 grid gap-8 sm:grid-cols-2">
        {reassurance.items.map((item) => (
          <div key={item.q}>
            <dt className="text-lg font-semibold text-ink-900">«&nbsp;{item.q}&nbsp;»</dt>
            <dd className="mt-2 text-base text-ink-700">{item.a}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-10 text-base">
        <Link href="/faq" className="font-semibold text-primary-700">
          {nav.faq} →
        </Link>
      </p>
    </Section>
  );
}
