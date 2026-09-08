import { landing } from "@tando/copy";
import { Section } from "@/components/section";

export function Pocket() {
  const { pocket } = landing;
  return (
    <Section muted>
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">{pocket.title}</h2>
        <p className="mt-5 text-lg text-ink-700">{pocket.body}</p>
        <p className="mt-4 text-sm italic text-ink-500">{pocket.note}</p>
        {/* Les badges App Store / Google Play ne s'affichent qu'une fois
            l'application réellement publiée (§8). */}
        {pocket.storesPublished ? null : null}
      </div>
    </Section>
  );
}
