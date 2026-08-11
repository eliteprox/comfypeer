import Link from "next/link";
import { SITE } from "@/lib/constants";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <circle cx="8" cy="16" r="5" stroke="var(--color-cool)" strokeWidth="2" fill="var(--color-cool-dim)" />
      <circle cx="24" cy="16" r="5" stroke="var(--color-live)" strokeWidth="2" fill="var(--color-live-dim)" />
      <path
        d="M13 16 C16 10, 16 22, 19 16"
        stroke="var(--color-live)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        className="edge-flow"
      />
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
