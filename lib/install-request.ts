import { INSTALL } from "./constants";

export const INSTALL_SOURCES = ["hero", "header", "docs", "approval", "footer"] as const;

export type InstallSource = (typeof INSTALL_SOURCES)[number];

export function installSourceFromQuery(value: string | null): InstallSource | undefined {
  if (!value) return undefined;
  return (INSTALL_SOURCES as readonly string[]).includes(value)
    ? (value as InstallSource)
    : undefined;
}

/** `sec-ch-ua-mobile: ?1` is a phone. Anything else, including a missing hint, is desktop. */
export function deviceClassFromClientHint(header: string | null): "mobile" | "desktop" {
  return header?.trim() === "?1" ? "mobile" : "desktop";
}

export function installHref(source?: InstallSource): string {
  if (!source) return INSTALL.redirectPath;
  return `${INSTALL.redirectPath}?source=${encodeURIComponent(source)}`;
}
