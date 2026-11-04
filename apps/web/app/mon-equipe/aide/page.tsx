import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { helpCopy } from "@tando/copy";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { HelpDesk } from "./help-desk";
import { HelpHistory } from "./help-history";

export const metadata: Metadata = { title: helpCopy.title, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AidePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const { topics, history } = await (await sessionApi()).help.home();

  return (
    <section className="mx-auto flex max-w-content flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div>
        <h1 className="text-3xl text-ink-950 sm:text-4xl">{helpCopy.title}</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-700">{helpCopy.intro}</p>
      </div>

      <HelpDesk topics={topics} />

      <div>
        <h2 className="text-xl font-bold text-ink-900">{helpCopy.historyTitle}</h2>
        <HelpHistory items={history} />
      </div>
    </section>
  );
}
