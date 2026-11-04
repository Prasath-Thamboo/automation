import { landing } from "@tando/copy";
import { Section, SectionHeading } from "@/components/section";
import { Bell, Smartphone } from "@/components/icons";

export function Pocket() {
  const { pocket, eyebrows } = landing;
  const v = pocket.visual;
  return (
    <Section tone="dark" labelledBy="poche">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionHeading
            id="poche"
            eyebrow={eyebrows.pocket}
            title={pocket.title}
            intro={pocket.body}
            invert
          />
          <p className="mt-6 flex items-center gap-3 text-base text-primary-100">
            <Smartphone className="h-6 w-6 shrink-0 text-primary-300" />
            {pocket.note}
          </p>
          {/* Les badges App Store / Google Play ne s'affichent qu'une fois
              l'application réellement publiée (§8). */}
          {pocket.storesPublished ? null : null}
        </div>

        {/* Illustration : téléphone avec une question et la réponse du patron. */}
        <div aria-hidden className="mx-auto w-full max-w-sm">
          <div className="rounded-[2.75rem] bg-ink-950 p-3 shadow-lift ring-1 ring-white/10">
            <div className="rounded-[2.1rem] bg-gradient-to-b from-primary-100 to-paper px-4 pb-8 pt-10">
              <div className="mx-auto mb-6 h-1.5 w-20 rounded-full bg-ink-900/15" />
              <div className="rounded-lg bg-white p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-primary-600 text-white">
                    <Bell className="h-5 w-5" />
                  </span>
                  <p className="flex-1 text-base font-bold text-ink-900">{v.from}</p>
                  <p className="text-sm text-ink-500">{v.when}</p>
                </div>
                <p className="mt-3 text-base text-ink-900">{v.question}</p>
              </div>
              <div className="ml-auto mt-4 w-fit max-w-[80%] rounded-lg rounded-br-sm bg-primary-600 px-4 py-3 text-base font-semibold text-white shadow-soft">
                {v.reply}
              </div>
              <div className="mt-4 w-fit max-w-[85%] rounded-lg rounded-bl-sm bg-white px-4 py-3 text-base text-ink-900 shadow-soft">
                {v.done}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
