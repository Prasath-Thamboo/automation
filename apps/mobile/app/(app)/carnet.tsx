import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import type { LogbookEntry } from "@tando/api-client";
import { api } from "@/src/api";
import { useQuery } from "@/src/use-query";
import { styles as s, t } from "@/src/theme";

const CHANNEL: Record<string, string> = {
  telephone: "Au téléphone",
  whatsapp: "Sur WhatsApp",
  email: "Par email",
  instagram: "Sur Instagram",
  formulaire: "Via le formulaire",
  surplace: "Sur place",
  autre: "Échange",
};

type Row = LogbookEntry & { assistantId: string; assistantName: string };

export default function CarnetScreen() {
  const [assistantId, setAssistantId] = useState<string | null>(null);

  const { data, loading, error, refreshing, refetch, stale } = useQuery(
    async () => {
      const { assistants } = await api.me.team();
      const active = assistants.filter((a) => a.onboarding === "termine");
      const details = await Promise.all(active.map((a) => api.me.assistant(a.id)));
      const rows: Row[] = details.flatMap((d) =>
        d.logbook.map((l) => ({ ...l, assistantId: d.id, assistantName: d.name })),
      );
      rows.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
      return { assistants: active.map((a) => ({ id: a.id, name: a.name })), rows };
    },
    [],
    { cache: "carnet" },
  );

  const rows = useMemo(
    () => (data ? data.rows.filter((r) => !assistantId || r.assistantId === assistantId) : []),
    [data, assistantId],
  );

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

      {data && data.assistants.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="Tous" active={!assistantId} onPress={() => setAssistantId(null)} />
          {data.assistants.map((a) => (
            <Chip
              key={a.id}
              label={a.name}
              active={assistantId === a.id}
              onPress={() => setAssistantId(a.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      {rows.length === 0 ? (
        <Text style={[s.body, { marginTop: t.space[4] }]}>Rien à afficher pour le moment.</Text>
      ) : (
        rows.map((r) => (
          <Link
            key={r.id}
            href={{
              pathname: "/(app)/conversation/[id]",
              params: { id: r.id, assistantId: r.assistantId },
            }}
            asChild
          >
            <Pressable style={s.card}>
              <Text style={{ fontSize: t.fontSize.base, color: t.color.ink }}>
                {r.summary || `Un échange ${CHANNEL[r.channel] ?? ""}`}
              </Text>
              <Text style={s.muted}>
                {r.assistantName} · {r.customerLabel} ·{" "}
                {new Date(r.lastMessageAt).toLocaleString("fr-FR")}
              </Text>
            </Pressable>
          </Link>
        ))
      )}
    </ScrollView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 40,
        paddingHorizontal: 16,
        justifyContent: "center",
        borderRadius: 999,
        borderWidth: 1,
        borderColor: t.color.primary,
        backgroundColor: active ? t.color.primary : "#fff",
      }}
    >
      <Text style={{ fontSize: 14, color: active ? "#fff" : t.color.primaryStrong }}>{label}</Text>
    </Pressable>
  );
}
