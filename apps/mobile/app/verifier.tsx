import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { verifyMagicLinkSchema } from "@tando/types";
import { auth as authCopy } from "@tando/copy";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { styles as s, t } from "@/src/theme";

type Status = "checking" | "done" | "error";

/** Cible du lien profond tando://verifier?token=... */
export default function VerifierScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const { signInWithToken } = useAuth();
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    const parsed = verifyMagicLinkSchema.safeParse({ token: params.token });
    if (!parsed.success) {
      setStatus("error");
      return;
    }
    api.auth
      .verify(parsed.data)
      .then(async (result) => {
        if (!result.token) throw new Error("jeton manquant");
        await signInWithToken(result.token);
        setStatus("done");
      })
      .catch(() => setStatus("error"));
  }, [params.token, signInWithToken]);

  if (status === "done") return <Redirect href="/(app)/aujourdhui" />;

  return (
    <View style={[s.screen, { padding: t.space[5], gap: t.space[4], justifyContent: "center" }]}>
      {status === "checking" ? (
        <>
          <ActivityIndicator color={t.color.primary} />
          <Text style={{ fontSize: 16, textAlign: "center", color: t.color.inkSoft }}>
            {authCopy.verifying}
          </Text>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 16, textAlign: "center", color: t.color.danger }}>
            {authCopy.error.linkExpired}
          </Text>
          <Pressable
            onPress={() => setStatus("checking")}
            style={[s.primaryBtn, { marginTop: t.space[4] }]}
          >
            <Text style={s.primaryBtnText}>Réessayer</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
