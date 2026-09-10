import { sessionApi } from "@/lib/api";
import { NewRuleForm, RuleRow } from "./pricing-editor";

export const dynamic = "force-dynamic";

const KIND_ORDER = ["socle", "module", "volume", "outil"];
const KIND_TITLE: Record<string, string> = {
  socle: "Socle — prix de départ par formule",
  module: "Modules — un poste de travail par tâche",
  volume: "Volume — coefficient appliqué au mensuel",
  outil: "Outils — coût de connexion",
};

export default async function AdminPrixPage() {
  const { rules } = await (await sessionApi()).admin.pricing.list();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Barème</h1>
        <p className="mt-1 text-base text-ink-500">
          Le moteur de chiffrage relit ces règles à chaque devis. Les changements prennent effet
          sans redéploiement.
        </p>
      </div>

      <NewRuleForm />

      {KIND_ORDER.map((kind) => {
        const group = rules.filter((r) => r.kind === kind);
        if (group.length === 0) return null;
        return (
          <section key={kind} className="space-y-2">
            <h2 className="text-lg font-semibold text-ink-900">{KIND_TITLE[kind]}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="text-ink-500">
                    <th className="border-b border-ink-100 py-2 pr-3">Clé</th>
                    <th className="border-b border-ink-100 py-2 pr-3">
                      Libellé · mise en service · mensuel · facteur · ordre · état
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.map((rule) => (
                    <RuleRow key={rule.id} rule={rule} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {rules.length === 0 ? (
        <p className="text-ink-500">
          Aucune règle. Le barème par défaut sera semé au premier devis, ou ajoutez-en ici.
        </p>
      ) : null}
    </div>
  );
}
