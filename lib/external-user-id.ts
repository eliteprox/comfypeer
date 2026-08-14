import "server-only";

import { createHash } from "node:crypto";

export function externalUserIdFromEmail(email: string): string {
  const normalized = email.trim().toLowerCase() || "demo@comfypeer.com";
  const hex = createHash("sha256")
    .update(`comfypeer:externalUserId:${normalized}`)
    .digest("hex");
  return `eu_${hex.slice(0, 32)}`;
}
