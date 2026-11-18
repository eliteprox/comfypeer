import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Remote models",
  description:
    "Remote models Livepeer AI Streaming can call from ComfyUI Desktop. Rates are not yet measured.",
};

export default function PipelinesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
