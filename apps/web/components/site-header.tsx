import Link from "next/link";
import { common } from "@tando/copy";

/** En-tête minimal du Lot 0. La barre de navigation complète arrive au Lot 1. */
export function SiteHeader() {
  return (
    <header
      style={{
        borderBottom: "1px solid var(--tnd-ink-500, #6b665c)33",
        padding: "16px 20px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: 18, textDecoration: "none" }}>
          {common.appName}
        </Link>
        <Link href="/connexion">Mon espace</Link>
      </div>
    </header>
  );
}
