import { PolicyFrame } from "@/components/public-policy-page";

export default function LegalNotFound() {
  return (
    <PolicyFrame>
      <header className="policy-intro">
        <h1 className="policy-heading">Page not found</h1>
        <p className="policy-summary">This policy page does not exist.</p>
      </header>
    </PolicyFrame>
  );
}
