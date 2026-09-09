import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { mobileEscalations as ex } from "@tando/copy";
import { api } from "@/src/api";
import { useQuery } from "@/src/use-query";
import { styles as s, t } from "@/src/theme";

export default function ValiderScreen() {
  const { data, loading, error, refreshing, refetch, stale } = useQuery(
    () => api.me.today(),
    [],
    { cache: "today" },
  );

  if (loading && !data) {
    return (
      <View style={[s.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={t.color.primary} />
      </View>
    );
  }

  const items = data?.openEscalations ?? [];

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ padding: t.space[4], gap: t.space[3] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
    >
      {error && !data ? <Text style={{ color: t.color.warning }}>{error}</Text> : null}
      {stale ? <Text style={s.muted}>Dernière version reçue.</Text> : null}

      {items.length === 0 ? (
        <View style={[s.card, { gap: 6 }]}>
          <Text style={s.h2}>{ex.empty.title}</Text>
          <Text style={s.body}>{ex.empty.body}</Text>
        </View>
      ) : (
        items.map((e) => (
          <Link
            key={e.id}
            href={{
              pathname: "/(app)/valider/[id]",
              params: { id: e.id, assistantName: e.assistantName, question: e.question },
            }}
            asChild
          >
            <Pressable style={[s.card, { gap: 4 }]}>
              <Text style={{ fontSize: t.fontSize.base, color: t.color.ink }}>{e.question}</Text>
              <Text style={s.muted}>
                {e.assistantName} · {ex.askedAt} {new Date(e.createdAt).toLocaleString("fr-FR")}
              </Text>
            </Pressable>
          </Link>
        ))
      )}
    </ScrollView>
  );
}
