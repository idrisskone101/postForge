import type { Metadata, Viewport } from "next";
import { LEGAL_FIRST_PAINT_CSS } from "../legal-first-paint-css";
import "../styles/tokens.css";
import "../legal.css";

export default function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/figtree-latin-wght-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <style>{LEGAL_FIRST_PAINT_CSS}</style>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.classList.toggle("dark",localStorage.getItem("postforge-theme")!=="light")}catch(e){document.documentElement.classList.add("dark")}})()`,
          }}
        />
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
