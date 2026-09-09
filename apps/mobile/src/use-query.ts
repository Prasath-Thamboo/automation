import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { cacheKey, readJson, writeJson } from "./store";

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  refreshing: boolean;
  /** true quand on affiche une version en cache (hors ligne ou fetch en échec). */
  stale: boolean;
}

interface Options {
  /** Si fourni, la dernière réponse est gardée localement et relue hors ligne. */
  cache?: string;
}

/** Récupère des données à l'affichage de l'écran et à chaque retour dessus. */
export function useQuery<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  options: Options = {},
): QueryState<T> {
  const { cache } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  // Hydrate depuis le cache dès le montage (affichage immédiat, même hors ligne).
  useEffect(() => {
    if (!cache) return;
    let alive = true;
    void readJson<T>(cacheKey(cache)).then((cached) => {
      if (alive && cached !== null) {
        setData((cur) => cur ?? cached);
        setStale(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [cache]);

  const run = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    try {
      const fresh = await fn();
      setData(fresh);
      setError(null);
      setStale(false);
      if (cache) void writeJson(cacheKey(cache), fresh);
    } catch {
      // Si on a déjà quelque chose à montrer, on reste dessus sans crier à l'erreur.
      setData((cur) => {
        if (cur !== null) setStale(true);
        else setError("Impossible de charger. Vérifiez votre connexion.");
        return cur;
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, deps);

  useEffect(() => {
    void run(false);
  }, deps);

  useFocusEffect(
    useCallback(() => {
      void run(true);
    }, [run]),
  );

  return { data, loading, error, refreshing, refetch: () => void run(true), stale };
}
