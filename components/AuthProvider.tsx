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
import { authLogoutHref } from "@/lib/app-url";
import { isValidEmail } from "@/lib/email";

export type ComfyUser = {
  id: string;
  email: string;
  name: string;
};

type AuthContextValue = {
  user: ComfyUser | null;
  ready: boolean;
  /** Auth0 session exists but the profile has no email claim. */
  missingEmail: boolean;
  signOut: () => Promise<void>;
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
  const [missingEmail, setMissingEmail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (isLoading) return;

      if (!auth0User) {
        localStorage.removeItem(STORAGE_KEY);
        await fetch("/api/session", { method: "DELETE" }).catch(() => null);
        if (!cancelled) {
          setUser(null);
          setMissingEmail(false);
          setReady(true);
        }
        return;
      }

      const email = auth0User.email?.trim().toLowerCase() || "";
      if (!isValidEmail(email)) {
        localStorage.removeItem(STORAGE_KEY);
        await fetch("/api/session", { method: "DELETE" }).catch(() => null);
        if (!cancelled) {
          setUser(null);
          setMissingEmail(true);
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
          if (!cancelled) {
            setUser(null);
            setMissingEmail(false);
          }
          return;
        }
        const provisioned = (await provisionRes.json()) as {
          externalUserId?: string;
          email?: string;
        };
        if (!provisioned.externalUserId || !provisioned.email) {
          localStorage.removeItem(STORAGE_KEY);
          if (!cancelled) {
            setUser(null);
            setMissingEmail(false);
          }
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
          name: displayNameFrom(provisioned.email, auth0User.name?.trim() || storedName),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        if (!cancelled) {
          setUser(next);
          setMissingEmail(false);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        if (!cancelled) {
          setUser(null);
          setMissingEmail(false);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth0User, isLoading]);

  const signOut = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setMissingEmail(false);
    try {
      await fetch("/api/session", { method: "DELETE" });
    } catch {
      /* ignore */
    }
    window.location.assign(authLogoutHref());
  }, []);

  const value = useMemo(
    () => ({ user, ready, missingEmail, signOut }),
    [user, ready, missingEmail, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
