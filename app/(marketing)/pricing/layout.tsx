import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "One balance for ComfyUI Desktop and the web studio. Prepaid, billed by the second.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
