import { LEGAL_FIRST_PAINT_CSS } from "../legal-first-paint-css";
import "../legal.css";

export default function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <style>{LEGAL_FIRST_PAINT_CSS}</style>
      {children}
    </>
  );
}
