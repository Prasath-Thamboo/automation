import { useCallback, useState } from "react";
import {
  ExpoSpeechRecognitionModule,
  isRecognitionAvailable,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

export type DictationError = "permission" | "generic" | null;

export interface Dictation {
  /** L'appareil sait faire de la reconnaissance vocale. */
  supported: boolean;
  listening: boolean;
  error: DictationError;
  /** Transcription courante (intermédiaire puis finale), vidée à chaque `start`. */
  transcript: string;
  start: () => Promise<void>;
  stop: () => void;
}

function available(): boolean {
  try {
    return isRecognitionAvailable();
  } catch {
    return false;
  }
}

/**
 * Dictée vocale (§6bis : consigne et réponse d'escalade « à la voix »). Repli
 * silencieux sur le clavier si l'appareil ne sait pas faire.
 */
export function useDictation(opts: { contextualStrings?: string[] } = {}): Dictation {
  const [supported] = useState(available);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<DictationError>(null);

  useSpeechRecognitionEvent("result", (event) => {
    setTranscript(event.results?.[0]?.transcript ?? "");
  });
  useSpeechRecognitionEvent("end", () => setListening(false));
  useSpeechRecognitionEvent("error", (event) => {
    setListening(false);
    setError(
      event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "permission"
        : "generic",
    );
  });

  const contextualStrings = opts.contextualStrings;

  const start = useCallback(async () => {
    if (!supported) return;
    setError(null);
    setTranscript("");
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setError("permission");
        return;
      }
      setListening(true);
      ExpoSpeechRecognitionModule.start({
        lang: "fr-FR",
        interimResults: true,
        continuous: false,
        addsPunctuation: true,
        ...(contextualStrings ? { contextualStrings } : {}),
      });
    } catch {
      setListening(false);
      setError("generic");
    }
  }, [supported, contextualStrings]);

  const stop = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  return { supported, listening, transcript, error, start, stop };
}
