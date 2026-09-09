import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useQuery } from "@/src/use-query";
import { styles as s, t } from "@/src/theme";

const STATE_LABEL: Record<string, string> = {
  en_formation: "en formation",
  au_travail: "au travail",
  en_pause: "en pause",
};

export default function AujourdhuiScreen() {
  const { user } = useAuth();
  const { data, loading, error, refreshing, refetch } = useQuery(() => api.me.today());

  if (loading) {
    return (
      <View style={[s.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={t.color.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ padding: t.space[4], gap: t.space[4] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
    >
      <Text style={s.h1}>Aujourd&apos;hui</Text>
      {user ? <Text style={s.muted}>{user.organizationName}</Text> : null}

      {error ? <Text style={{ color: t.color.warning }}>{error}</Text> : null}

      {data ? (
        <>
          <View style={s.card}>
            <Text style={s.h2}>Ce qu&apos;il a fait</Text>
            <Text style={[s.body, { marginTop: 4 }]}>
              {data.todayCount} demande{data.todayCount > 1 ? "s" : ""} aujourd&apos;hui ·{" "}
              {data.weekCount} cette semaine.
            </Text>
          </View>

          <View style={s.card}>
            <Text style={s.h2}>À valider</Text>
            {data.openEscalations.length === 0 ? (
              <Text style={[s.body, { marginTop: 4 }]}>Rien à valider. Il gère.</Text>
            ) : (
              data.openEscalations.map((e) => (
                <View key={e.id} style={{ marginTop: t.space[3] }}>
                  <Text style={{ fontSize: t.fontSize.base, color: t.color.ink }}>{e.question}</Text>
                  <Text style={s.muted}>{e.assistantName}</Text>
                </View>
              ))
            )}
            <Text style={[s.muted, { marginTop: t.space[3] }]}>
              Répondre à une demande arrivera par notification au prochain lot.
            </Text>
          </View>

          <View style={s.card}>
            <Text style={s.h2}>Ce qui vous attend</Text>
            {data.upcomingAppointments.length === 0 ? (
              <Text style={[s.body, { marginTop: 4 }]}>Aucun rendez-vous à venir.</Text>
            ) : (
              data.upcomingAppointments.map((ap) => (
                <View key={ap.id} style={{ marginTop: t.space[3] }}>
                  <Text style={{ fontSize: t.fontSize.base, color: t.color.ink }}>
                    {ap.slot
                      ? new Date(ap.slot).toLocaleString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Créneau à confirmer"}
                  </Text>
                  <Text style={s.muted}>
                    {ap.customerLabel} · {ap.assistantName}
                  </Text>
                </View>
              ))
            )}
          </View>

          {data.assistants.length > 0 ? (
            <View style={s.card}>
              <Text style={s.h2}>Votre équipe</Text>
              {data.assistants.map((a) => (
                <Link
                  key={a.id}
                  href={{ pathname: "/(app)/equipe" }}
                  style={{ marginTop: t.space[3] }}
                >
                  <Text style={{ fontSize: t.fontSize.base, color: t.color.ink }}>
                    {a.name} — {STATE_LABEL[a.state] ?? a.state}
                  </Text>
                </Link>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}
