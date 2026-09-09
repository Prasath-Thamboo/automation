import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "@/src/api";
import { useQuery } from "@/src/use-query";
import { styles as s, t } from "@/src/theme";

const AUTHOR: Record<string, string> = { client: "Client", assistant: "Assistant", patron: "Vous" };

export default function ConversationScreen() {
  const { id, assistantId } = useLocalSearchParams<{ id: string; assistantId: string }>();
  const { data, loading, error } = useQuery(
    () => api.me.conversation(String(assistantId), String(id)),
    [id, assistantId],
  );

  if (loading) {
    return (
      <View style={[s.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={t.color.primary} />
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={[s.screen, { padding: t.space[5] }]}>
        <Text style={s.body}>{error ?? "Conversation introuvable."}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: t.space[4], gap: t.space[3] }}>
      <Text style={s.muted}>{data.customerLabel}</Text>
      {data.messages.map((m, i) => (
        <View
          key={i}
          style={{
            maxWidth: "85%",
            alignSelf: m.author === "client" ? "flex-start" : "flex-end",
            backgroundColor: m.author === "client" ? "#e7e3da" : t.color.primary + "22",
            borderRadius: t.radius.md,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text style={{ fontSize: 12, color: t.color.inkFaint, marginBottom: 2 }}>
            {AUTHOR[m.author] ?? m.author} · {new Date(m.at).toLocaleTimeString("fr-FR")}
          </Text>
          <Text style={{ fontSize: t.fontSize.base, color: t.color.ink }}>{m.text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
