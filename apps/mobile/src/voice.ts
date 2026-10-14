import { useCallback, useState } from "react";
import type * as SpeechRecognition from "expo-speech-recognition";

type SpeechRecognitionExports = typeof SpeechRecognition;

// Chargement paresseux : `expo-speech-recognition` appelle son module natif dès
// l'import (absent dans Expo Go / sans dev build), donc un `try/catch` autour
// de l'appel seul ne suffit pas — il faut intercepter l'échec du `require` lui-même.
let speech: SpeechRecognitionExports | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  speech = require("expo-speech-recognition") as SpeechRecognitionExports;
} catch {
  speech = null;
}

const useSpeechRecognitionEvent: SpeechRecognitionExports["useSpeechRecognitionEvent"] =
  speech?.useSpeechRecognitionEvent ?? (() => {});

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
  if (!speech) return false;
  try {
    return speech.isRecognitionAvailable();
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
    if (!speech) return;
    setError(null);
    setTranscript("");
    try {
      const perm = await speech.ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setError("permission");
        return;
      }
      setListening(true);
      speech.ExpoSpeechRecognitionModule.start({
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
      speech?.ExpoSpeechRecognitionModule.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  return { supported, listening, transcript, error, start, stop };
}
