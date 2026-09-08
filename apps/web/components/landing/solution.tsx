import { landing } from "@tando/copy";
import { Section } from "@/components/section";

export function Solution() {
  const { solution } = landing;
  return (
    <Section>
      <h2 className="max-w-3xl text-2xl font-bold text-ink-900 sm:text-3xl">{solution.title}</h2>
      <ol className="mt-10 grid gap-8 sm:grid-cols-3">
        {solution.steps.map((step, i) => (
          <li key={step.title}>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-50 font-heading text-lg font-bold text-primary-700">
              {i + 1}
            </span>
            <h3 className="mt-4 text-lg font-semibold text-ink-900">{step.title}</h3>
            <p className="mt-2 text-base text-ink-700">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
