import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { mobileNotifications as nx } from "@tando/copy";
import type { NotificationPrefs } from "@tando/api-client";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useQuery } from "@/src/use-query";
import { requestPushPermission, syncPushToken } from "@/src/notifications";
import { styles as s, t } from "@/src/theme";

const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

export default function ReglagesScreen() {
  const { signOut } = useAuth();
  const { data, loading } = useQuery(() => api.me.notificationPrefs(), [], {
    cache: "notif-prefs",
  });

  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setPrefs(data);
  }, [data]);

  async function patch(next: Partial<NotificationPrefs>): Promise<void> {
    if (!prefs) return;
    const optimistic = { ...prefs, ...next };
    setPrefs(optimistic);
    try {
      const fresh = await api.me.updateNotificationPrefs(next);
      setPrefs(fresh);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setPrefs(prefs); // rollback
    }
  }

  if (loading && !prefs) {
    return (
      <View style={[s.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={t.color.primary} />
      </View>
    );
  }
  if (!prefs) {
    return (
      <View style={[s.screen, { padding: t.space[5] }]}>
        <Text style={s.body}>Réglages indisponibles pour le moment.</Text>
      </View>
    );
  }

  const quietOn = Boolean(prefs.quietStart && prefs.quietEnd);
  const qsHour = prefs.quietStart ? Number(prefs.quietStart.slice(0, 2)) : 22;
  const qeHour = prefs.quietEnd ? Number(prefs.quietEnd.slice(0, 2)) : 7;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ padding: t.space[4], gap: t.space[4] }}
    >
      <Text style={s.body}>{nx.intro}</Text>

      <Pressable
        onPress={async () => {
          await requestPushPermission();
          await syncPushToken();
        }}
        style={[s.primaryBtn, { minHeight: 44 }]}
      >
        <Text style={s.primaryBtnText}>{nx.askPermission.allow}</Text>
      </Pressable>

      <Row
        label={nx.escalations.label}
        help={nx.escalations.help}
        value={prefs.escalations}
        onValueChange={(v) => void patch({ escalations: v })}
      />

      <Row
        label={nx.dailySummary.label}
        help={nx.dailySummary.help}
        value={prefs.dailySummary}
        onValueChange={(v) => void patch({ dailySummary: v })}
      />
      {prefs.dailySummary ? (
        <Stepper
          label={nx.dailySummary.hourLabel}
          value={hourLabel(prefs.dailySummaryHour)}
          onDec={() => void patch({ dailySummaryHour: (prefs.dailySummaryHour + 23) % 24 })}
          onInc={() => void patch({ dailySummaryHour: (prefs.dailySummaryHour + 1) % 24 })}
        />
      ) : null}

      <Row
        label={nx.paymentFailure.label}
        help={nx.paymentFailure.help}
        value={prefs.paymentFailure}
        onValueChange={(v) => void patch({ paymentFailure: v })}
      />

      <Row
        label={nx.quietHours.label}
        help={nx.quietHours.help}
        value={quietOn}
        onValueChange={(v) =>
          void patch(v ? { quietStart: "22:00", quietEnd: "07:00" } : { quietStart: null, quietEnd: null })
        }
      />
      {quietOn ? (
        <View style={{ gap: t.space[2] }}>
          <Stepper
            label={nx.quietHours.from}
            value={hourLabel(qsHour)}
            onDec={() => void patch({ quietStart: hourLabel((qsHour + 23) % 24) })}
            onInc={() => void patch({ quietStart: hourLabel((qsHour + 1) % 24) })}
          />
          <Stepper
            label={nx.quietHours.to}
            value={hourLabel(qeHour)}
            onDec={() => void patch({ quietEnd: hourLabel((qeHour + 23) % 24) })}
            onInc={() => void patch({ quietEnd: hourLabel((qeHour + 1) % 24) })}
          />
        </View>
      ) : null}

      {saved ? <Text style={s.muted}>{nx.saved}</Text> : null}

      <Pressable onPress={() => void signOut()} style={{ padding: t.space[4], alignItems: "center" }}>
        <Text style={{ color: t.color.inkFaint, fontSize: 15 }}>Se déconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({
  label,
  help,
  value,
  onValueChange,
}: {
  label: string;
  help: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={[s.card, { flexDirection: "row", alignItems: "center", gap: t.space[3] }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: t.fontSize.base, color: t.color.ink, fontWeight: "600" }}>
          {label}
        </Text>
        <Text style={s.muted}>{help}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: t.color.primary }}
      />
    </View>
  );
}

function Stepper({
  label,
  value,
  onInc,
  onDec,
}: {
  label: string;
  value: string;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: t.space[4],
      }}
    >
      <Text style={s.body}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: t.space[3] }}>
        <StepBtn label="−" onPress={onDec} />
        <Text style={{ fontSize: t.fontSize.lg, color: t.color.ink, minWidth: 64, textAlign: "center" }}>
          {value}
        </Text>
        <StepBtn label="+" onPress={onInc} />
      </View>
    </View>
  );
}

function StepBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: t.color.primary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 20, color: t.color.primaryStrong }}>{label}</Text>
    </Pressable>
  );
}
