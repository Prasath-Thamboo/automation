import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/src/auth";
import { styles as s, t } from "@/src/theme";

export default function AppLayout() {
  const { status, unlock } = useAuth();

  useEffect(() => {
    if (status === "locked") void unlock();
  }, [status, unlock]);

  if (status === "loading") return null;
  if (status === "signedOut") return <Redirect href="/" />;

  if (status === "locked") {
    return (
      <View style={[s.screen, { padding: t.space[5], gap: t.space[4], justifyContent: "center" }]}>
        <Text style={s.h1}>Votre espace est verrouillé</Text>
        <Text style={s.body}>Déverrouillez avec Face ID, l&apos;empreinte ou votre code.</Text>
        <Pressable onPress={() => void unlock()} style={s.primaryBtn}>
          <Text style={s.primaryBtnText}>Déverrouiller</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.color.primary,
        headerStyle: { backgroundColor: t.color.paper },
        headerShadowVisible: false,
        headerTitleStyle: { color: t.color.ink },
        tabBarStyle: { backgroundColor: t.color.white },
      }}
    >
      <Tabs.Screen name="aujourdhui" options={{ title: "Aujourd'hui" }} />
      <Tabs.Screen name="carnet" options={{ title: "Carnet de bord" }} />
      <Tabs.Screen name="equipe" options={{ title: "Mon équipe" }} />
      <Tabs.Screen name="conversation/[id]" options={{ href: null, title: "Conversation" }} />
    </Tabs>
  );
}
