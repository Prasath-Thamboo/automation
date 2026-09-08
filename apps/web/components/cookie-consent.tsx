"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cookiesCopy } from "@tando/copy";

const STORAGE_KEY = "tando_consent";

/**
 * Bandeau cookies conforme CNIL : « refuser » aussi simple et visible
 * qu'« accepter » (§9.4). Aujourd'hui le site n'utilise que des cookies
 * nécessaires ; ce bandeau enregistre le choix pour le jour où une mesure
 * d'audience serait ajoutée (elle devra vérifier `tando_consent === "all"`).
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // Stockage indisponible : on n'affiche rien plutôt qu'un bandeau bloquant.
    }
  }, []);

  function choose(value: "all" | "necessary") {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={cookiesCopy.title}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-100 bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] sm:p-6"
    >
      <div className="mx-auto flex max-w-content flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-base text-ink-700">
          {cookiesCopy.banner.text}{" "}
          <Link href="/cookies" className="font-semibold text-primary-700">
            {cookiesCopy.banner.manage}
          </Link>
        </p>
        <div className="flex flex-shrink-0 gap-3">
          <button
            type="button"
            onClick={() => choose("necessary")}
            className="min-h-touch rounded-md border border-primary-600 px-4 py-2 text-base font-semibold text-primary-700 hover:bg-primary-50"
          >
            {cookiesCopy.banner.reject}
          </button>
          <button
            type="button"
            onClick={() => choose("all")}
            className="min-h-touch rounded-md bg-primary-600 px-4 py-2 text-base font-semibold text-white hover:bg-primary-700"
          >
            {cookiesCopy.banner.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
