import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Redirect } from "expo-router";
import { requestMagicLinkSchema } from "@tando/types";
import { auth as authCopy, common } from "@tando/copy";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { styles as s, t } from "@/src/theme";

type Status = "idle" | "sending" | "sent" | "error";

export default function ConnexionScreen() {
  const { status: authStatus } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>();

  if (authStatus === "loading") {
    return (
      <View style={[s.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={t.color.primary} />
      </View>
    );
  }
  if (authStatus === "unlocked" || authStatus === "locked") {
    return <Redirect href="/(app)/aujourdhui" />;
  }

  async function submit() {
    const parsed = requestMagicLinkSchema.safeParse({ email, channel: "mobile" });
    if (!parsed.success) {
      setStatus("error");
      setMessage(authCopy.error.invalidEmail);
      return;
    }
    setStatus("sending");
    try {
      await api.auth.requestMagicLink(parsed.data);
      setStatus("sent");
    } catch {
      setStatus("error");
      setMessage(authCopy.error.generic);
    }
  }

  if (status === "sent") {
    return (
      <ScrollView contentContainerStyle={{ padding: t.space[5], gap: t.space[3] }}>
        <Text style={s.h1}>{authCopy.sent.title}</Text>
        <Text style={s.body}>{authCopy.sent.body}</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: t.space[5], gap: t.space[4] }}>
      <Text style={[s.h1, { marginTop: t.space[8] }]}>{common.appName}</Text>
      <Text style={s.body}>Votre employé virtuel, 24h/24, 7j/7.</Text>

      <View style={{ gap: 6, marginTop: t.space[4] }}>
        <Text style={{ fontSize: t.fontSize.base, fontWeight: "600", color: t.color.ink }}>
          {authCopy.emailLabel}
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={authCopy.emailPlaceholder}
          autoCapitalize="none"
          keyboardType="email-address"
          inputMode="email"
          style={s.input}
        />
        {status === "error" ? (
          <Text style={{ color: t.color.danger, fontSize: 14 }}>{message}</Text>
        ) : null}
      </View>

      <Pressable
        onPress={submit}
        disabled={status === "sending"}
        style={[s.primaryBtn, { opacity: status === "sending" ? 0.6 : 1 }]}
      >
        {status === "sending" ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.primaryBtnText}>{authCopy.submit}</Text>
        )}
      </Pressable>

      <Text style={s.muted}>{common.talkToHuman}</Text>
    </ScrollView>
  );
}
