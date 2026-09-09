import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  refreshing: boolean;
}

/** Récupère des données à l'affichage de l'écran et à chaque retour dessus. */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = []): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      try {
        setData(await fn());
        setError(null);
      } catch {
        setError("Impossible de charger. Vérifiez votre connexion.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    deps,
  );

  useEffect(() => {
    void run(false);
  }, deps);

  useFocusEffect(
    useCallback(() => {
      void run(true);
    }, [run]),
  );

  return { data, loading, error, refreshing, refetch: () => void run(true) };
}
