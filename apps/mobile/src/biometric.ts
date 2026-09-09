import * as LocalAuthentication from "expo-local-authentication";

/** L'appareil peut-il verrouiller l'app par biométrie / code ? */
export async function canUseBiometrics(): Promise<boolean> {
  try {
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

/** Demande le déverrouillage. Renvoie `true` si l'utilisateur est authentifié. */
export async function promptUnlock(): Promise<boolean> {
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: "Déverrouiller Tando",
      fallbackLabel: "Utiliser le code",
      cancelLabel: "Annuler",
    });
    return res.success;
  } catch {
    return false;
  }
}
