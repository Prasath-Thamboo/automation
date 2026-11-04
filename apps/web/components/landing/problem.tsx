import { landing } from "@tando/copy";
import { Section, SectionHeading } from "@/components/section";
import { Clock, Moon, Phone } from "@/components/icons";

const icons = [Phone, Moon, Clock];

export function Problem() {
  const { problem, eyebrows } = landing;
  return (
    <Section tone="white" labelledBy="probleme">
      <SectionHeading id="probleme" eyebrow={eyebrows.problem} title={problem.title} />
      <ul className="mt-12 grid gap-5 md:grid-cols-3">
        {problem.lines.map((line, i) => {
          const Icon = icons[i % icons.length] ?? Phone;
          return (
            <li key={line} className="rounded-lg border border-accent-100 bg-accent-50 p-6">
              <span className="grid h-12 w-12 place-items-center rounded-md bg-white text-accent-600 shadow-soft">
                <Icon />
              </span>
              <p className="mt-5 text-lg text-ink-900">{line}</p>
            </li>
          );
        })}
      </ul>
      <p className="mt-10 max-w-3xl border-l-4 border-accent-500 pl-5 font-heading text-xl font-bold text-ink-900 sm:text-2xl">
        {problem.punch}
      </p>
    </Section>
  );
}
