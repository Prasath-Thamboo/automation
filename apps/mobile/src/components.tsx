import { useEffect, useRef } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { mobileConnectivity as cx, mobileVoice as vx } from "@tando/copy";
import { styles as s, t } from "./theme";
import { useIsOnline } from "./net";
import { usePendingActions } from "./offline-queue";
import { useDictation } from "./voice";

/** Bandeau discret : hors ligne et/ou actions en attente d'envoi (§6bis). */
export function ConnectivityBanner(): React.ReactElement | null {
  const online = useIsOnline();
  const { count, flush } = usePendingActions();

  useEffect(() => {
    if (online) flush();
  }, [online, flush]);

  if (online !== false && count === 0) return null;

  const label =
    online === false
      ? count > 0
        ? `${cx.offline} · ${cx.queued(count)}`
        : cx.offline
      : cx.queued(count);

  return (
    <View
      style={{
        backgroundColor: online === false ? "#e7e3da" : t.color.primary + "22",
        paddingVertical: 8,
        paddingHorizontal: t.space[4],
      }}
    >
      <Text style={{ fontSize: 13, color: t.color.inkSoft }}>{label}</Text>
    </View>
  );
}

interface DictateFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  contextualStrings?: string[];
}

/** Champ texte avec bouton de dictée. Repli clavier si l'appareil ne sait pas. */
export function DictateField({
  value,
  onChangeText,
  placeholder,
  multiline = true,
  contextualStrings,
}: DictateFieldProps): React.ReactElement {
  const dictation = useDictation(contextualStrings ? { contextualStrings } : {});
  const baseRef = useRef("");

  useEffect(() => {
    if (dictation.listening && dictation.transcript) {
      const prefix = baseRef.current ? `${baseRef.current.trim()} ` : "";
      onChangeText(prefix + dictation.transcript);
    }
  }, [dictation.listening, dictation.transcript, onChangeText]);

  function toggle(): void {
    if (dictation.listening) {
      dictation.stop();
      return;
    }
    baseRef.current = value;
    void dictation.start();
  }

  return (
    <View style={{ gap: 6 }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.color.inkFaint}
        multiline={multiline}
        style={[s.input, multiline ? { minHeight: 96, paddingTop: 10 } : null]}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {dictation.supported ? (
          <Pressable
            onPress={toggle}
            style={{
              minHeight: 44,
              paddingHorizontal: 14,
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: dictation.listening ? t.color.accent : t.color.primary,
              backgroundColor: dictation.listening ? t.color.accent + "22" : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: t.color.primaryStrong, fontWeight: "600", fontSize: 14 }}>
              {dictation.listening ? `● ${vx.stop}` : `🎤 ${vx.start}`}
            </Text>
          </Pressable>
        ) : null}
        {dictation.listening ? <Text style={s.muted}>{vx.listening}</Text> : null}
        {dictation.error === "permission" ? (
          <Text style={{ color: t.color.warning, fontSize: 13, flex: 1 }}>
            {vx.permissionDenied}
          </Text>
        ) : null}
        {dictation.error === "generic" ? (
          <Text style={{ color: t.color.warning, fontSize: 13, flex: 1 }}>{vx.unavailable}</Text>
        ) : null}
      </View>
    </View>
  );
}
