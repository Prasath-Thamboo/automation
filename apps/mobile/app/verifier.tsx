import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { verifyMagicLinkSchema } from "@tando/types";
import { auth as authCopy } from "@tando/copy";
import { api } from "@/src/api";
import { setSessionToken } from "@/src/session";

type Status = "checking" | "done" | "error";

/** Cible du lien profond tando://verifier?token=... */
export default function VerifierScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [status, setStatus] = useState<Status>("checking");
  const [name, setName] = useState<string>();

  useEffect(() => {
    const parsed = verifyMagicLinkSchema.safeParse({ token: params.token });
    if (!parsed.success) {
      setStatus("error");
      return;
    }
    api.auth
      .verify(parsed.data)
      .then(async (result) => {
        if (result.token) await setSessionToken(result.token);
        setName(result.user.fullName ?? result.user.email);
        setStatus("done");
      })
      .catch(() => setStatus("error"));
  }, [params.token]);

  return (
    <View style={{ flex: 1, padding: 20, gap: 16, justifyContent: "center" }}>
      {status === "checking" ? (
        <>
          <ActivityIndicator />
          <Text style={{ fontSize: 16, textAlign: "center" }}>{authCopy.verifying}</Text>
        </>
      ) : null}

      {status === "done" ? (
        <>
          <Text style={{ fontSize: 22, fontWeight: "700", textAlign: "center" }}>
            Vous êtes connecté{name ? `, ${name}` : ""}.
          </Text>
          <Pressable
            onPress={() => router.replace("/")}
            style={{
              minHeight: 52,
              borderRadius: 10,
              backgroundColor: "#26714b",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>Continuer</Text>
          </Pressable>
        </>
      ) : null}

      {status === "error" ? (
        <Text style={{ fontSize: 16, textAlign: "center", color: "#b23b3b" }}>
          {authCopy.error.linkExpired}
        </Text>
      ) : null}
    </View>
  );
}
