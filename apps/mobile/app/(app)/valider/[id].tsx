import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { mobileEscalations as ex } from "@tando/copy";
import { api } from "@/src/api";
import { queueAction } from "@/src/offline-queue";
import { isOnlineNow } from "@/src/net";
import { DictateField } from "@/src/components";
import { styles as s, t } from "@/src/theme";

export default function AnswerEscalationScreen() {
  const router = useRouter();
  const { id, assistantName, question } = useLocalSearchParams<{
    id: string;
    assistantName?: string;
    question?: string;
  }>();

  const [answer, setAnswer] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<"sent" | "queued" | null>(null);

  async function send(text: string): Promise<void> {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      if (await isOnlineNow()) {
        await api.me.answerEscalation(String(id), { answer: value });
        setDone("sent");
      } else {
        await queueAction({ kind: "answerEscalation", escalationId: String(id), answer: value });
        setDone("queued");
      }
      setTimeout(() => router.back(), 700);
    } catch {
      await queueAction({ kind: "answerEscalation", escalationId: String(id), answer: value });
      setDone("queued");
      setTimeout(() => router.back(), 900);
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <View style={[s.screen, { padding: t.space[5], justifyContent: "center" }]}>
        <Text style={s.h2}>{done === "sent" ? ex.sent : ex.offlineQueued}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ padding: t.space[4], gap: t.space[4] }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ gap: 4 }}>
        {assistantName ? <Text style={s.muted}>{assistantName}</Text> : null}
        <Text style={s.h2}>{question ?? "Sa question"}</Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={s.muted}>Réponses rapides</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {ex.quickReplies.map((q) => (
            <Pressable
              key={q}
              disabled={sending}
              onPress={() => void send(q)}
              style={{
                minHeight: 44,
                paddingHorizontal: 14,
                justifyContent: "center",
                borderRadius: 999,
                borderWidth: 1,
                borderColor: t.color.primary,
                opacity: sending ? 0.5 : 1,
              }}
            >
              <Text style={{ color: t.color.primaryStrong, fontSize: 14 }}>{q}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={s.muted}>{ex.answerLabel}</Text>
        <DictateField
          value={answer}
          onChangeText={setAnswer}
          placeholder={ex.answerPlaceholder}
          contextualStrings={question ? [question] : undefined}
        />
      </View>

      <Pressable
        onPress={() => void send(answer)}
        disabled={sending || answer.trim().length === 0}
        style={[
          s.primaryBtn,
          { opacity: sending || answer.trim().length === 0 ? 0.5 : 1 },
        ]}
      >
        <Text style={s.primaryBtnText}>{sending ? ex.sending : ex.send}</Text>
      </Pressable>
    </ScrollView>
  );
}
