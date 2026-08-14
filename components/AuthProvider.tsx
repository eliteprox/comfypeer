"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ComfyUser = {
  id: string;
  email: string;
  name: string;
};

type AuthContextValue = {
  user: ComfyUser | null;
  ready: boolean;
  signIn: (email: string, name?: string) => Promise<void>;
  signOut: () => void;
};

const STORAGE_KEY = "comfypeer-user";

export async function externalUserIdFromEmail(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase() || "demo@comfypeer.com";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`comfypeer:externalUserId:${normalized}`),
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `eu_${hex.slice(0, 32)}`;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ComfyUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const next = JSON.parse(raw) as ComfyUser;
          if (!cancelled) setUser(next);
          await fetch("/api/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ externalUserId: next.id }),
          }).catch(() => null);
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, name?: string) => {
    const id = await externalUserIdFromEmail(email);
    const next: ComfyUser = {
      id,
      email: email.trim().toLowerCase(),
      name: name?.trim() || email.split("@")[0] || "User",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setUser(next);
    await fetch("/api/pymthouse/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalUserId: id, email: next.email }),
    }).catch(() => null);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    void fetch("/api/session", { method: "DELETE" }).catch(() => null);
  }, []);

  const value = useMemo(() => ({ user, ready, signIn, signOut }), [user, ready, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
