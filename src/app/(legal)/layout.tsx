import type { Metadata, Viewport } from "next";
import { LEGAL_FIRST_PAINT_CSS } from "../legal-first-paint-css";
import "../legal.css";

export default function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{LEGAL_FIRST_PAINT_CSS}</style>
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

export const metadata: Metadata = {
  title: "PostForge",
  description: "Self-hosted AI content generation platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
