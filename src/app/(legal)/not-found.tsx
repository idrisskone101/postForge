import Link from "next/link";

export default function LegalNotFound() {
  return (
    <main className="policy-main">
      <header className="policy-titleBlock">
        <h1 className="policy-heading" data-policy-title="Page not found">
          <span className="sr-only">Page not found</span>
        </h1>
        <p className="policy-summary" data-policy-summary="This policy page does not exist.">
          <span className="sr-only">This policy page does not exist.</span>
        </p>
      </header>
      <p className="policy-copy">
        <Link href="/privacy" prefetch={false}>
          Privacy
        </Link>
        {" · "}
        <Link href="/terms" prefetch={false}>
          Terms
        </Link>
        {" · "}
        <Link href="/data-deletion" prefetch={false}>
          Data deletion
        </Link>
      </p>
    </main>
  );
}
