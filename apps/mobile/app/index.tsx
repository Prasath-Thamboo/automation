import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { requestMagicLinkSchema } from "@tando/types";
import { auth as authCopy, common } from "@tando/copy";
import { api } from "@/src/api";

type Status = "idle" | "sending" | "sent" | "error";

export default function ConnexionScreen() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>();
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);

  // Smoke test du Lot 0 : le client partagé @tando/api-client joint bien l'API.
  useEffect(() => {
    api
      .health()
      .then((h) => setApiReachable(h.status === "ok"))
      .catch(() => setApiReachable(false));
  }, []);

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
      <View style={{ flex: 1, padding: 20, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>{authCopy.sent.title}</Text>
        <Text style={{ fontSize: 16, lineHeight: 24 }}>{authCopy.sent.body}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>{authCopy.title}</Text>

      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 16, fontWeight: "600" }}>{authCopy.emailLabel}</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={authCopy.emailPlaceholder}
          autoCapitalize="none"
          keyboardType="email-address"
          inputMode="email"
          style={{
            minHeight: 44,
            borderWidth: 1,
            borderColor: "#a8a296",
            borderRadius: 10,
            paddingHorizontal: 12,
            fontSize: 16,
            backgroundColor: "#fff",
          }}
        />
        {status === "error" ? (
          <Text style={{ color: "#b23b3b", fontSize: 14 }}>{message}</Text>
        ) : null}
      </View>

      <Pressable
        onPress={submit}
        disabled={status === "sending"}
        style={{
          minHeight: 52,
          borderRadius: 10,
          backgroundColor: "#26714b",
          alignItems: "center",
          justifyContent: "center",
          opacity: status === "sending" ? 0.6 : 1,
        }}
      >
        {status === "sending" ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>{authCopy.submit}</Text>
        )}
      </Pressable>

      <Text style={{ fontSize: 14, color: "#6b665c" }}>{common.talkToHuman}</Text>

      {apiReachable === false ? (
        <Text style={{ fontSize: 14, color: "#a9781a" }}>
          Le service est injoignable pour le moment. Vérifiez votre connexion.
        </Text>
      ) : null}
    </ScrollView>
  );
}
