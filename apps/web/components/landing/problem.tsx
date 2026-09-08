import { landing } from "@tando/copy";
import { Section } from "@/components/section";

export function Problem() {
  const { problem } = landing;
  return (
    <Section muted>
      <h2 className="max-w-3xl text-2xl font-bold text-ink-900 sm:text-3xl">{problem.title}</h2>
      <ul className="mt-6 max-w-2xl space-y-3">
        {problem.lines.map((line) => (
          <li key={line} className="border-l-2 border-accent-500 pl-4 text-lg text-ink-700">
            {line}
          </li>
        ))}
      </ul>
      <p className="mt-8 max-w-2xl text-lg font-semibold text-ink-900">{problem.punch}</p>
    </Section>
  );
}
