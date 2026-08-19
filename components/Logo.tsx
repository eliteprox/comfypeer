import Link from "next/link";
import { SITE } from "@/lib/constants";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <circle cx="24" cy="32" r="18" fill="var(--color-cool)" fillOpacity="0.9" />
      <circle cx="40" cy="32" r="18" fill="var(--color-live)" fillOpacity="0.82" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="text-base font-semibold tracking-tight text-fg">{SITE.name}</span>
    </Link>
  );
}
