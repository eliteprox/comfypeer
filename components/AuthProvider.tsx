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
import { useUser } from "@auth0/nextjs-auth0/client";

export type ComfyUser = {
  id: string;
  email: string;
  name: string;
};

type AuthContextValue = {
  user: ComfyUser | null;
  ready: boolean;
  signOut: () => void;
};

const STORAGE_KEY = "comfypeer-user";

const AuthContext = createContext<AuthContextValue | null>(null);

function displayNameFrom(email: string, preferredName?: string): string {
  const trimmed = preferredName?.trim();
  if (trimmed) return trimmed;
  return email.split("@")[0] || "User";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: auth0User, isLoading } = useUser();
  const [user, setUser] = useState<ComfyUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (isLoading) return;

      if (!auth0User?.email) {
        localStorage.removeItem(STORAGE_KEY);
        await fetch("/api/session", { method: "DELETE" }).catch(() => null);
        if (!cancelled) {
          setUser(null);
          setReady(true);
        }
        return;
      }

      try {
        const provisionRes = await fetch("/api/pymthouse/provision", {
          method: "POST",
        });
        if (!provisionRes.ok) {
          localStorage.removeItem(STORAGE_KEY);
          if (!cancelled) setUser(null);
          return;
        }
        const provisioned = (await provisionRes.json()) as {
          externalUserId?: string;
          email?: string;
        };
        if (!provisioned.externalUserId || !provisioned.email) {
          localStorage.removeItem(STORAGE_KEY);
          if (!cancelled) setUser(null);
          return;
        }

        let storedName: string | undefined;
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const stored = JSON.parse(raw) as ComfyUser;
            if (stored.id === provisioned.externalUserId) {
              storedName = stored.name;
            }
          }
        } catch {
          /* ignore corrupt local profile */
        }

        const next: ComfyUser = {
          id: provisioned.externalUserId,
          email: provisioned.email,
          name: displayNameFrom(
            provisioned.email,
            auth0User.name?.trim() || storedName,
          ),
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
  }, [auth0User, isLoading]);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    void fetch("/api/session", { method: "DELETE" })
      .catch(() => null)
      .finally(() => {
        window.location.assign("/auth/logout?returnTo=/");
      });
  }, []);

  const value = useMemo(() => ({ user, ready, signOut }), [user, ready, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
