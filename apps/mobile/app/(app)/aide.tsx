import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, type Href } from "expo-router";
import type { HelpAction, HelpRequestItem, HelpTopic } from "@velekya/api-client";
import { helpCopy as hx } from "@velekya/copy";
import { api } from "@/src/api";
import { useQuery } from "@/src/use-query";
import { styles as s, t } from "@/src/theme";

/** Renvois vers les écrans de l'app. Pas d'écran « documents » sur mobile :
 *  le contrat est dans « Mon compte » (et aucun paiement ici, règles des stores). */
const ROUTE: Record<Exclude<HelpAction, "aucune">, { href: Href; label: string }> = {
  equipe: { href: "/(app)/equipe", label: hx.actions.equipe },
  documents: { href: "/(app)/compte", label: hx.actions.compte },
  compte: { href: "/(app)/compte", label: hx.actions.compte },
  reglages: { href: "/(app)/reglages", label: hx.actions.reglages },
  carnet: { href: "/(app)/carnet", label: hx.actions.carnet },
};

interface Turn {
  question: string;
  request: HelpRequestItem;
  suggestions: HelpTopic[];
  feedbackSent?: boolean;
}

const chip = {
  minHeight: 44,
  justifyContent: "center",
  borderRadius: 999,
  borderWidth: 1,
  borderColor: "#d8d3c8",
  backgroundColor: t.color.white,
  paddingHorizontal: t.space[4],
  paddingVertical: t.space[2],
} as const;

export default function AideScreen() {
  const home = useQuery(() => api.help.home(), [], { cache: "help" });
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  async function ask(question: string, articleId?: string) {
    const text = question.trim();
    if (text.length < 3 || busy) return;
    setBusy(true);
    setError(null);
    setDraft("");
    try {
      const reply = await api.help.ask({ question: text, ...(articleId ? { articleId } : {}) });
      setTurns((all) => [
        ...all,
        { question: text, request: reply.request, suggestions: reply.suggestions },
      ]);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    } catch {
      setError(hx.error);
      setDraft(text);
    } finally {
      setBusy(false);
    }
  }

  function patch(id: string, next: Partial<Turn>) {
    setTurns((all) => all.map((x) => (x.request.id === id ? { ...x, ...next } : x)));
  }

  async function feedback(id: string, helpful: boolean) {
    try {
      patch(id, { request: await api.help.feedback(id, helpful), feedbackSent: true });
    } catch {
      setError(hx.error);
    }
  }

  async function transmit(id: string) {
    setBusy(true);
    try {
      patch(id, { request: await api.help.transmit(id) });
      home.refetch();
    } catch {
      setError(hx.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={s.screen}
      contentContainerStyle={{ padding: t.space[4], gap: t.space[4] }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={home.refreshing} onRefresh={home.refetch} />}
    >
      <Text style={s.body}>{hx.intro}</Text>

      {turns.map((turn) => {
        const r = turn.request;
        const link = r.answer && r.action !== "aucune" ? ROUTE[r.action] : null;
        const canTransmit =
          r.status === "sans_reponse" || (r.status === "repondue" && r.helpful === false);
        return (
          <View key={r.id} style={{ gap: t.space[2] }}>
            <View
              style={{
                alignSelf: "flex-end",
                maxWidth: "85%",
                backgroundColor: "#ece8df",
                borderRadius: t.radius.md,
                padding: t.space[3],
              }}
            >
              <Text style={s.body} accessibilityLabel={`${hx.you} : ${turn.question}`}>
                {turn.question}
              </Text>
            </View>

            <View style={[s.card, { gap: t.space[3], maxWidth: "95%" }]}>
              <Text style={s.body}>{r.answer ?? hx.noAnswer}</Text>
              {link ? (
                <Pressable onPress={() => router.push(link.href)} style={{ minHeight: 44, justifyContent: "center" }}>
                  <Text style={{ color: t.color.primaryStrong, fontSize: 16, fontWeight: "600" }}>
                    {link.label} →
                  </Text>
                </Pressable>
              ) : null}

              {turn.suggestions.length > 0 ? (
                <View style={{ gap: t.space[2] }}>
                  <Text style={s.muted}>{hx.maybe}</Text>
                  {turn.suggestions.map((sg) => (
                    <Pressable key={sg.id} onPress={() => void ask(sg.question, sg.id)} style={chip}>
                      <Text style={{ color: t.color.primaryStrong, fontSize: 15, fontWeight: "600" }}>
                        {sg.question}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {r.status === "repondue" && !turn.feedbackSent ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.space[2] }}>
                  <Text style={s.muted}>{hx.helpfulQuestion}</Text>
                  <Pressable onPress={() => void feedback(r.id, true)} style={chip}>
                    <Text style={s.body}>{hx.helpfulYes}</Text>
                  </Pressable>
                  <Pressable onPress={() => void feedback(r.id, false)} style={chip}>
                    <Text style={s.body}>{hx.helpfulNo}</Text>
                  </Pressable>
                </View>
              ) : null}
              {turn.feedbackSent && r.helpful ? <Text style={s.muted}>{hx.thanks}</Text> : null}

              {canTransmit ? (
                <Pressable
                  onPress={() => void transmit(r.id)}
                  disabled={busy}
                  style={[s.primaryBtn, { minHeight: 48, opacity: busy ? 0.5 : 1 }]}
                >
                  <Text style={[s.primaryBtnText, { fontSize: 16 }]}>{hx.transmit}</Text>
                </Pressable>
              ) : null}
              {r.status === "transmise" ? (
                <Text style={[s.body, { color: t.color.primaryStrong }]}>{hx.transmitted}</Text>
              ) : null}
            </View>
          </View>
        );
      })}

      {busy ? <ActivityIndicator color={t.color.primary} /> : null}

      <View style={{ gap: t.space[2] }}>
        <TextInput
          testID="help-question"
          value={draft}
          onChangeText={setDraft}
          placeholder={hx.placeholder}
          placeholderTextColor={t.color.inkFaint}
          accessibilityLabel={hx.title}
          maxLength={500}
          multiline
          style={[s.input, { paddingVertical: t.space[2] }]}
          onSubmitEditing={() => void ask(draft)}
        />
        <Pressable
          onPress={() => void ask(draft)}
          disabled={busy || draft.trim().length < 3}
          style={[s.primaryBtn, { opacity: busy || draft.trim().length < 3 ? 0.5 : 1 }]}
        >
          <Text style={s.primaryBtnText}>{busy ? hx.asking : hx.ask}</Text>
        </Pressable>
        {error ? <Text style={{ color: t.color.danger, fontSize: 15 }}>{error}</Text> : null}
      </View>

      {home.data && home.data.topics.length > 0 ? (
        <View style={{ gap: t.space[2] }}>
          <Text style={s.h2}>{hx.topicsTitle}</Text>
          {home.data.topics.map((topic) => (
            <Pressable key={topic.id} onPress={() => void ask(topic.question, topic.id)} style={chip}>
              <Text style={{ color: t.color.ink, fontSize: 15, fontWeight: "600" }}>{topic.question}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {home.data ? (
        <View style={{ gap: t.space[2] }}>
          <Text style={s.h2}>{hx.historyTitle}</Text>
          {home.data.history.length === 0 ? <Text style={s.muted}>{hx.historyEmpty}</Text> : null}
          {home.data.history.map((item) => (
            <View key={item.id} style={[s.card, { gap: t.space[1] }]}>
              <Text style={[s.body, { fontWeight: "600", color: t.color.ink }]}>{item.question}</Text>
              <Text style={s.muted}>
                {hx.status[item.status]} · {new Date(item.createdAt).toLocaleDateString("fr-FR")}
              </Text>
              {item.answer ? (
                <>
                  {item.status === "traitee" ? (
                    <Text style={[s.muted, { color: t.color.primaryStrong, fontWeight: "700" }]}>
                      {hx.teamAnswer}
                    </Text>
                  ) : null}
                  <Text style={s.body}>{item.answer}</Text>
                </>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
