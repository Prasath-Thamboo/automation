import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#fbf9f4" },
          headerTintColor: "#1c1a17",
          contentStyle: { backgroundColor: "#fbf9f4" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Tando" }} />
        <Stack.Screen name="verifier" options={{ title: "Connexion" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
