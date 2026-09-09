import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { mobileTraining as tx } from "@tando/copy";
import { api } from "@/src/api";
import { useQuery } from "@/src/use-query";
import { queueAction } from "@/src/offline-queue";
import { isOnlineNow } from "@/src/net";
import { DictateField } from "@/src/components";
import { styles as s, t } from "@/src/theme";

export default function FormerScreen() {
  const { assistantId } = useLocalSearchParams<{ assistantId: string }>();
  const id = String(assistantId);

  const { data, loading, error, refetch, stale } = useQuery(
    () => api.me.assistant(id),
    [id],
    { cache: `assistant:${id}` },
  );

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function add(): Promise<void> {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setNote(null);
    try {
      if (await isOnlineNow()) {
        await api.me.addInstruction(id, { text: value });
        setText("");
        refetch();
      } else {
        await queueAction({ kind: "addInstruction", assistantId: id, text: value });
        setText("");
        setNote("Sera ajoutée dès le retour du réseau.");
      }
    } catch {
      await queueAction({ kind: "addInstruction", assistantId: id, text: value });
      setText("");
      setNote("Sera ajoutée dès le retour du réseau.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) {
    return (
      <View style={[s.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={t.color.primary} />
      </View>
    );
  }

  const instructions = data?.instructions ?? [];

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ padding: t.space[4], gap: t.space[4] }}
      keyboardShouldPersistTaps="handled"
    >
      {data ? <Text style={s.muted}>{data.name}</Text> : null}
      <Text style={s.body}>{tx.intro}</Text>
      {error && !data ? <Text style={{ color: t.color.warning }}>{error}</Text> : null}
      {stale ? <Text style={s.muted}>Dernière version reçue.</Text> : null}

      <DictateField value={text} onChangeText={setText} placeholder={tx.placeholder} />
      <Pressable
        onPress={() => void add()}
        disabled={busy || text.trim().length === 0}
        style={[s.primaryBtn, { opacity: busy || text.trim().length === 0 ? 0.5 : 1 }]}
      >
        <Text style={s.primaryBtnText}>{busy ? tx.adding : tx.add}</Text>
      </Pressable>
      {note ? <Text style={s.muted}>{note}</Text> : null}

      <View style={{ gap: t.space[3] }}>
        <Text style={s.h2}>{tx.history}</Text>
        {instructions.length === 0 ? (
          <Text style={s.body}>{tx.empty}</Text>
        ) : (
          instructions.map((ins) => (
            <View key={ins.version} style={[s.card, { gap: 4 }]}>
              <Text style={{ fontSize: t.fontSize.base, color: t.color.ink }}>{ins.text}</Text>
              <Text style={s.muted}>
                {ins.active ? "Active" : "Remplacée"} ·{" "}
                {new Date(ins.createdAt).toLocaleDateString("fr-FR")}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
