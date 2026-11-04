import { landing } from "@tando/copy";
import { Section, SectionHeading } from "@/components/section";
import { Check, Pencil, Users } from "@/components/icons";

const icons = [Pencil, Users, Check];

export function Solution() {
  const { solution, eyebrows } = landing;
  return (
    <Section labelledBy="solution">
      <SectionHeading id="solution" eyebrow={eyebrows.solution} title={solution.title} />
      <ol className="relative mt-14 grid gap-6 md:grid-cols-3">
        {/* Fil conducteur entre les étapes (grand écran). */}
        <span
          aria-hidden
          className="absolute left-[16%] right-[16%] top-8 hidden h-0.5 bg-gradient-to-r from-primary-200 via-primary-300 to-primary-200 md:block"
        />
        {solution.steps.map((step, i) => {
          const Icon = icons[i % icons.length] ?? Check;
          return (
            <li key={step.title} className="relative flex flex-col items-start md:items-center md:text-center">
              <span className="relative grid h-16 w-16 place-items-center rounded-full bg-primary-600 text-white shadow-glow ring-8 ring-paper">
                <Icon className="h-7 w-7" />
                <span className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full bg-white font-heading text-base font-bold text-primary-700 shadow-soft">
                  {i + 1}
                </span>
              </span>
              <h3 className="mt-6 text-xl text-ink-900">{step.title}</h3>
              <p className="mt-3 text-base text-ink-700">{step.body}</p>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
