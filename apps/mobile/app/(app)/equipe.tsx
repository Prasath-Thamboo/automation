import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { mobileAccount as ax, mobileNotifications as nx, mobileTraining as tx } from "@tando/copy";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useQuery } from "@/src/use-query";
import { syncWidget } from "@/src/widget-bridge";
import { styles as s, t } from "@/src/theme";

const STATE_LABEL: Record<string, string> = {
  en_formation: "en formation",
  au_travail: "au travail",
  en_pause: "en pause",
};

export default function EquipeScreen() {
  const { signOut } = useAuth();
  const { data, loading, error, refreshing, refetch, stale } = useQuery(() => api.me.team(), [], {
    cache: "team",
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  // Tient le widget d'écran d'accueil à jour à chaque état d'équipe reçu.
  useEffect(() => {
    if (data) void syncWidget(data);
  }, [data]);

  // Deep link depuis le widget / une notification : tando://(app)/equipe?do=pause
  const { do: intent } = useLocalSearchParams<{ do?: string }>();
  const intentDone = useRef(false);

  async function toggle(id: string, paused: boolean) {
    setBusyId(id);
    try {
      if (paused) await api.me.resumeAssistant(id);
      else await api.me.pauseAssistant(id);
      refetch();
    } catch {
      Alert.alert("Action impossible pour le moment.");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    if (intentDone.current || !data || (intent !== "pause" && intent !== "resume")) return;
    const target = data.assistants.find((a) => a.onboarding === "termine");
    if (!target) return;
    intentDone.current = true;
    void toggle(target.id, intent === "resume");
  }, [data, intent]);

  if (loading && !data) {
    return (
      <View style={[s.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={t.color.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ padding: t.space[4], gap: t.space[3] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
    >
      {error && !data ? <Text style={{ color: t.color.warning }}>{error}</Text> : null}
      {stale ? <Text style={s.muted}>Dernière version reçue.</Text> : null}

      {data && data.assistants.length === 0 ? (
        <Text style={s.body}>
          Votre équipe est encore vide. Ajoutez un employé depuis le site.
        </Text>
      ) : null}

      {data?.assistants.map((a) => {
        const paused = a.state === "en_pause";
        return (
          <View key={a.id} style={s.card}>
            <Text style={s.h2}>{a.name}</Text>
            <Text style={s.body}>{a.role}</Text>
            <Text style={[s.muted, { marginTop: 4 }]}>État : {STATE_LABEL[a.state] ?? a.state}</Text>

            {a.onboarding !== "termine" ? (
              <Text style={[s.muted, { marginTop: t.space[3] }]}>
                Terminez sa mise en service depuis le site pour qu&apos;il prenne son poste.
              </Text>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: t.space[3] }}>
                <Pressable
                  onPress={() => toggle(a.id, paused)}
                  disabled={busyId === a.id}
                  style={{
                    minHeight: 44,
                    paddingHorizontal: 14,
                    borderRadius: t.radius.md,
                    borderWidth: 1,
                    borderColor: t.color.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: busyId === a.id ? 0.5 : 1,
                  }}
                >
                  <Text style={{ color: t.color.primaryStrong, fontWeight: "600", fontSize: 15 }}>
                    {busyId === a.id
                      ? "…"
                      : paused
                        ? "Le remettre au travail"
                        : "Le mettre en pause"}
                  </Text>
                </Pressable>
                <Link
                  href={{ pathname: "/(app)/former/[assistantId]", params: { assistantId: a.id } }}
                  asChild
                >
                  <Pressable
                    style={{
                      minHeight: 44,
                      paddingHorizontal: 14,
                      borderRadius: t.radius.md,
                      borderWidth: 1,
                      borderColor: t.color.primary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: t.color.primaryStrong, fontWeight: "600", fontSize: 15 }}>
                      {tx.title}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            )}
          </View>
        );
      })}

      <Link href="/(app)/reglages" asChild>
        <Pressable style={{ padding: t.space[4], alignItems: "center" }}>
          <Text style={{ color: t.color.primaryStrong, fontSize: 15, fontWeight: "600" }}>
            {nx.title}
          </Text>
        </Pressable>
      </Link>

      <Link href="/(app)/compte" asChild>
        <Pressable style={{ padding: t.space[4], alignItems: "center" }}>
          <Text style={{ color: t.color.primaryStrong, fontSize: 15, fontWeight: "600" }}>
            {ax.title}
          </Text>
        </Pressable>
      </Link>

      <Pressable onPress={() => void signOut()} style={{ padding: t.space[4], alignItems: "center" }}>
        <Text style={{ color: t.color.inkFaint, fontSize: 15 }}>Se déconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}
