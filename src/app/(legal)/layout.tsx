export default function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `requestAnimationFrame(function(){var l=document.createElement("link");l.rel="stylesheet";l.href="/legal.css";l.media="print";l.onload=function(){l.media="all"};document.head.appendChild(l)})`,
        }}
      />
      <noscript>
        <link rel="stylesheet" href="/legal.css" />
      </noscript>
      {children}
    </>
  );
}
