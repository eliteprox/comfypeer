import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { SITE } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.oneLiner,
  metadataBase: new URL(SITE.url),
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.oneLiner,
    siteName: SITE.name,
    type: "website",
    images: [
      {
        url: "/comfyui-text-to-speech.jpg",
        width: 1024,
        height: 718,
        alt: "Text-to-speech in ComfyUI Desktop, signed in with a ComfyPeer account.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.oneLiner,
    images: ["/comfyui-text-to-speech.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-fg antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
