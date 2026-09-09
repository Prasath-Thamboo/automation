import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { mobileAccount as ax } from "@tando/copy";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useQuery } from "@/src/use-query";
import { styles as s, t } from "@/src/theme";

const CONTRACT_STATUS = ax.contract.status as Record<string, string>;

export default function CompteScreen() {
  const { signOut } = useAuth();
  const account = useQuery(() => api.me.account(), [], { cache: "account" });
  const billing = useQuery(() => api.me.billing(), [], { cache: "billing" });

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (account.data) setName(account.data.fullName ?? "");
  }, [account.data]);

  const info = account.data;
  const canManageAccount = info?.role === "owner" || info?.role === "admin";

  async function saveName() {
    if (!info || savingName) return;
    setSavingName(true);
    setNameSaved(false);
    try {
      await api.me.updateAccount({ fullName: name.trim() });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 1500);
    } catch {
      Alert.alert(ax.identity.title, "Enregistrement impossible pour le moment.");
    } finally {
      setSavingName(false);
    }
  }

  async function exportData() {
    if (exporting) return;
    setExporting(true);
    try {
      const json = await api.me.exportData();
      await Share.share({ message: json, title: ax.data.exportLabel });
    } catch {
      Alert.alert(ax.data.title, ax.data.exportFailed);
    } finally {
      setExporting(false);
    }
  }

  function confirmDelete() {
    Alert.alert(ax.danger.confirmTitle, ax.danger.confirmBody, [
      { text: ax.danger.cancel, style: "cancel" },
      { text: ax.danger.confirmCta, style: "destructive", onPress: () => void runDelete() },
    ]);
  }

  async function runDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await api.me.deleteAccount();
      Alert.alert(ax.danger.title, ax.danger.done);
      await signOut();
      router.replace("/");
    } catch {
      Alert.alert(ax.danger.title, ax.danger.failed);
      setDeleting(false);
    }
  }

  if (account.loading && !info) {
    return (
      <View style={[s.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={t.color.primary} />
      </View>
    );
  }
  if (!info) {
    return (
      <View style={[s.screen, { padding: t.space[5] }]}>
        <Text style={s.body}>Compte indisponible pour le moment.</Text>
      </View>
    );
  }

  const sub = billing.data?.subscription ?? info.subscription;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ padding: t.space[4], gap: t.space[4] }}
      refreshControl={
        <RefreshControl
          refreshing={account.refreshing}
          onRefresh={() => {
            account.refetch();
            billing.refetch();
          }}
        />
      }
    >
      {/* Coordonnées */}
      <View style={[s.card, { gap: t.space[2] }]}>
        <Text style={s.h2}>{ax.identity.title}</Text>
        <Text style={s.muted}>{ax.identity.nameLabel}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={s.input}
          placeholder={ax.identity.nameLabel}
          placeholderTextColor={t.color.inkFaint}
        />
        <Text style={[s.muted, { marginTop: t.space[2] }]}>{ax.identity.emailLabel}</Text>
        <Text style={s.body}>{info.email}</Text>
        <Pressable
          onPress={() => void saveName()}
          disabled={savingName}
          style={[s.primaryBtn, { minHeight: 44, marginTop: t.space[3], opacity: savingName ? 0.5 : 1 }]}
        >
          <Text style={s.primaryBtnText}>
            {savingName ? ax.identity.saving : ax.identity.save}
          </Text>
        </Pressable>
        {nameSaved ? <Text style={s.muted}>{ax.identity.saved}</Text> : null}
      </View>

      {/* L'équipe (personnes) */}
      <View style={[s.card, { gap: t.space[2] }]}>
        <Text style={s.h2}>{ax.team.title}</Text>
        {info.members.map((m) => (
          <Text key={m.email} style={s.body}>
            {m.fullName ?? m.email}
            {m.email === info.email ? ` (${ax.team.you})` : ""} — {m.role}
          </Text>
        ))}
      </View>

      {/* Contrat */}
      <View style={[s.card, { gap: t.space[2] }]}>
        <Text style={s.h2}>{ax.contract.title}</Text>
        {sub ? (
          <>
            <Text style={s.body}>
              {ax.contract.formulaLabel} : {sub.formula}
            </Text>
            <Text style={s.body}>
              {ax.contract.monthlyLabel} : {sub.monthlyEur.toFixed(2)} {sub.currency}
            </Text>
            <Text style={s.body}>
              {(CONTRACT_STATUS[sub.status] ?? sub.status)}
            </Text>
            {sub.canceledAt ? (
              <Text style={s.muted}>
                {ax.contract.canceledLabel} {new Date(sub.canceledAt).toLocaleDateString("fr-FR")}
              </Text>
            ) : sub.currentPeriodEnd ? (
              <Text style={s.muted}>
                {ax.contract.renewsLabel} :{" "}
                {new Date(sub.currentPeriodEnd).toLocaleDateString("fr-FR")}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={s.body}>{ax.contract.none}</Text>
        )}
        {/* Renvoi vers le web — texte seul, aucun lien cliquable (règles App Store). */}
        <Text style={[s.muted, { marginTop: t.space[2] }]}>
          {billing.data?.manage.hint ?? ax.contract.manageOnWeb}
        </Text>
      </View>

      {/* Données */}
      <View style={[s.card, { gap: t.space[2] }]}>
        <Text style={s.h2}>{ax.data.title}</Text>
        <Pressable
          onPress={() => void exportData()}
          disabled={exporting}
          style={{
            minHeight: 44,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: t.color.primary,
            alignItems: "center",
            justifyContent: "center",
            opacity: exporting ? 0.5 : 1,
          }}
        >
          <Text style={{ color: t.color.primaryStrong, fontWeight: "600", fontSize: 15 }}>
            {exporting ? ax.data.exporting : ax.data.exportLabel}
          </Text>
        </Pressable>
      </View>

      {/* Zone sensible */}
      <View style={[s.card, { gap: t.space[2], borderColor: t.color.warning }]}>
        <Text style={[s.h2, { color: t.color.warning }]}>{ax.danger.title}</Text>
        <Text style={s.body}>{ax.danger.body}</Text>
        {canManageAccount ? (
          <Pressable
            onPress={confirmDelete}
            disabled={deleting}
            style={{
              minHeight: 44,
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: t.color.warning,
              alignItems: "center",
              justifyContent: "center",
              marginTop: t.space[2],
              opacity: deleting ? 0.5 : 1,
            }}
          >
            <Text style={{ color: t.color.warning, fontWeight: "600", fontSize: 15 }}>
              {deleting ? "…" : ax.danger.button}
            </Text>
          </Pressable>
        ) : (
          <Text style={s.muted}>{ax.danger.ownerOnly}</Text>
        )}
      </View>

      <Pressable onPress={() => void signOut()} style={{ padding: t.space[4], alignItems: "center" }}>
        <Text style={{ color: t.color.inkFaint, fontSize: 15 }}>Se déconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}
