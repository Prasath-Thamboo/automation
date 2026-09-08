import Link from "next/link";
import { common } from "@tando/copy";

/**
 * Page d'accueil — Lot 0 : placeholder sobre. Les textes complets du §8 (hero,
 * problème, solution, rassurance, CTA final) arrivent au Lot 1.
 */
export default function HomePage() {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 36, margin: 0 }}>Recrutez un employé qui ne dort jamais.</h1>
      <p style={{ fontSize: 18, color: "var(--tnd-ink-700)", margin: 0 }}>
        {common.appName} vous prépare un employé virtuel qui répond à vos clients, prend vos
        rendez-vous et gère vos demandes. 24h/24, 7j/7, week-ends compris.
      </p>
      <p style={{ margin: 0 }}>
        <Link
          href="/connexion"
          style={{
            display: "inline-block",
            background: "var(--tnd-primary-600)",
            color: "#fff",
            padding: "14px 24px",
            borderRadius: 10,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Entrer dans mon espace
        </Link>
      </p>
      <p style={{ fontSize: 14, color: "var(--tnd-ink-500)", margin: 0 }}>
        Site en cours de construction — la vitrine complète arrive bientôt.
      </p>
    </section>
  );
}
