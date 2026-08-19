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

const AuthContext = createContext<AuthContextValue | null>(null);

function displayNameFrom(email: string, storedName?: string): string {
  const trimmed = storedName?.trim();
  if (trimmed) return trimmed;
  return email.split("@")[0] || "User";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ComfyUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sessionRes = await fetch("/api/session");
        if (!sessionRes.ok) {
          localStorage.removeItem(STORAGE_KEY);
          if (!cancelled) setUser(null);
          return;
        }
        const session = (await sessionRes.json()) as {
          externalUserId?: string;
          email?: string;
        };
        if (!session.externalUserId || !session.email) {
          localStorage.removeItem(STORAGE_KEY);
          if (!cancelled) setUser(null);
          return;
        }
        let storedName: string | undefined;
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const stored = JSON.parse(raw) as ComfyUser;
            if (stored.id === session.externalUserId) {
              storedName = stored.name;
            }
          }
        } catch {
          /* ignore corrupt local profile */
        }
        const next: ComfyUser = {
          id: session.externalUserId,
          email: session.email,
          name: displayNameFrom(session.email, storedName),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        if (!cancelled) setUser(next);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, name?: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const provisionRes = await fetch("/api/pymthouse/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail }),
    });
    if (!provisionRes.ok) {
      throw new Error("Could not establish authenticated session");
    }
    const provisioned = (await provisionRes.json()) as {
      externalUserId?: string;
      email?: string;
    };
    if (!provisioned.externalUserId || !provisioned.email) {
      throw new Error("Could not establish authenticated session");
    }
    const next: ComfyUser = {
      id: provisioned.externalUserId,
      email: provisioned.email,
      name: displayNameFrom(provisioned.email, name),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setUser(next);
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
