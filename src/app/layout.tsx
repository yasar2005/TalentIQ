import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TalentIQ - Smart AI Interview Platform",
    template: "%s | TalentIQ",
  },
  description:
    "TalentIQ is the AI interview platform built for modern hiring teams. Conduct structured voice, chat, and video interviews — organized by company, scored automatically.",
  keywords: [
    "AI interview platform",
    "smart hiring",
    "voice interview",
    "video interview",
    "candidate assessment",
    "interview automation",
    "company hiring",
    "AI recruiter",
    "interview analytics",
    "talent acquisition",
  ],
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "TalentIQ",
    title: "TalentIQ - Smart AI Interview Platform",
    description:
      "TalentIQ is the AI interview platform built for modern hiring teams. Conduct structured voice, chat, and video interviews — organized by company, scored automatically.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "TalentIQ - Smart AI Interview Platform",
    description:
      "TalentIQ is the AI interview platform built for modern hiring teams. Conduct structured voice, chat, and video interviews — organized by company, scored automatically.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${plusJakarta.variable}`}>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
