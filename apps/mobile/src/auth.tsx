import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import type { SessionUser } from "@tando/api-client";
import { api } from "./api";
import { clearSessionToken, getSessionToken, setSessionToken } from "./session";
import { canUseBiometrics, promptUnlock } from "./biometric";

type Status = "loading" | "signedOut" | "locked" | "unlocked";

interface AuthValue {
  status: Status;
  user: SessionUser | null;
  signInWithToken: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  unlock: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);
  const biometricsRef = useRef(false);

  const loadSession = useCallback(async () => {
    const token = await getSessionToken();
    if (!token) {
      setStatus("signedOut");
      return;
    }
    try {
      const me = await api.auth.me();
      setUser(me);
      biometricsRef.current = await canUseBiometrics();
      setStatus(biometricsRef.current ? "locked" : "unlocked");
    } catch {
      await clearSessionToken();
      setUser(null);
      setStatus("signedOut");
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  // Reverrouiller quand l'app revient au premier plan.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") return;
      if (biometricsRef.current) {
        setStatus((s) => (s === "unlocked" ? "locked" : s));
      }
    });
    return () => sub.remove();
  }, []);

  const signInWithToken = useCallback(async (token: string) => {
    await setSessionToken(token);
    const me = await api.auth.me();
    setUser(me);
    biometricsRef.current = await canUseBiometrics();
    setStatus("unlocked");
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.auth.signOut();
    } catch {
      /* le jeton est peut-être déjà invalide */
    }
    await clearSessionToken();
    setUser(null);
    setStatus("signedOut");
  }, []);

  const unlock = useCallback(async () => {
    const ok = await promptUnlock();
    if (ok) setStatus("unlocked");
  }, []);

  const value = useMemo(
    () => ({ status, user, signInWithToken, signOut, unlock }),
    [status, user, signInWithToken, signOut, unlock],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
