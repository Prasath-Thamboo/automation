import { sessionApi } from "@/lib/api";
import { AnswerForm, ArticleRow, NewArticleForm } from "./help-editor";

export const dynamic = "force-dynamic";

const frDateTime = (s: string) =>
  new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

export default async function AdminAidePage() {
  const api = (await sessionApi()).admin.help;
  const [{ requests }, { articles }] = await Promise.all([api.requests(), api.articles()]);

  const toHandle = requests.filter((r) => r.status === "transmise");
  const gaps = requests.filter(
    (r) => r.status === "sans_reponse" || (r.status === "repondue" && r.helpful === false),
  );
  const answered = requests.filter((r) => r.status === "traitee").slice(0, 20);

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Aide « Une question ? »</h1>
        <p className="mt-1 text-base text-ink-500">
          Les clients posent leurs questions depuis leur espace (web + mobile). Le matcher cherche
          dans la base ci-dessous ; sans réponse sûre, le client peut transmettre sa question ici.
          Base : {articles.length} réponses · {requests.length} questions récentes.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink-900">À traiter ({toHandle.length})</h2>
        {toHandle.length === 0 ? (
          <p className="text-ink-500">Aucune question en attente.</p>
        ) : (
          <ul className="space-y-4">
            {toHandle.map((r) => (
              <li key={r.id} className="rounded-lg border border-accent-300 bg-white p-4">
                <p className="text-sm text-ink-500">
                  {r.organization.name} · {r.userEmail ?? "compte supprimé"} · transmise le{" "}
                  {frDateTime(r.transmittedAt ?? r.createdAt)}
                  {r.article ? ` · réponse donnée : « ${r.article.question} » (jugée inutile)` : ""}
                </p>
                <p className="mt-1 text-base font-semibold text-ink-900">{r.question}</p>
                <AnswerForm id={r.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink-900">Trous dans la base ({gaps.length})</h2>
        <p className="text-sm text-ink-500">
          Questions sans réponse, ou dont la réponse a été jugée inutile : à couvrir par une
          nouvelle réponse ou de nouveaux mots-clés.
        </p>
        {gaps.length === 0 ? (
          <p className="text-ink-500">Rien à signaler.</p>
        ) : (
          <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white">
            {gaps.map((r) => (
              <li key={r.id} className="p-3 text-sm">
                <span className="font-semibold text-ink-900">{r.question}</span>
                <span className="text-ink-500">
                  {" "}
                  — {r.organization.name}, {frDateTime(r.createdAt)}
                  {r.article ? ` · a reçu « ${r.article.question} »` : " · aucune réponse"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink-900">Base de réponses</h2>
        <NewArticleForm />
        <ul className="space-y-3">
          {articles.map((a) => (
            <ArticleRow key={a.id} article={a} />
          ))}
        </ul>
      </section>

      {answered.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink-900">Déjà répondues</h2>
          <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white">
            {answered.map((r) => (
              <li key={r.id} className="p-3 text-sm">
                <p className="font-semibold text-ink-900">{r.question}</p>
                <p className="text-ink-500">
                  {r.organization.name} · répondu le{" "}
                  {r.answeredAt ? frDateTime(r.answeredAt) : "—"}
                </p>
                <p className="mt-1 whitespace-pre-line text-ink-700">{r.staffAnswer}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
