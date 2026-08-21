import type { Metadata } from "next";
import { PublicPolicyPage } from "@/components/public-policy-page";

export const metadata: Metadata = {
  title: "Data Deletion Instructions - PostForge",
  description: "How to disconnect social accounts and delete provider data stored by PostForge.",
};

export default function DataDeletionPage() {
  return (
    <PublicPolicyPage
      title="Data Deletion Instructions"
      summary="Use these steps to revoke a connected social account and remove its locally stored authorization, cached provider metrics, and provider-linked publishing state from PostForge."
      effectiveDate="August 9, 2026"
      currentPath="/data-deletion"
      sections={[
        {
          id: "disconnect",
          title: "Disconnect from PostForge",
          content: (
            <ol className={orderedListClass}>
              <li>Open the private PostForge deployment and go to Settings → Integrations.</li>
              <li>Find the TikTok, Instagram, or YouTube account you want to remove and choose Disconnect.</li>
              <li>Confirm the account and provider shown in the deletion prompt.</li>
              <li>PostForge will ask the provider to revoke the authorization. After the provider confirms, PostForge deletes the local encrypted connection, tokens, cached metrics, and provider-linked recovery data.</li>
            </ol>
          ),
        },
        {
          id: "revocation-failure",
          title: "If provider revocation fails",
          content: (
            <>
              <p>PostForge does not claim an account is disconnected when the provider has not confirmed revocation. The local connection remains visible so the operator can retry. If immediate local removal is required, the operator can use the separate permanent local-deletion confirmation shown by PostForge and then revoke PostForge from the provider&apos;s connected-app or security settings.</p>
            </>
          ),
        },
        {
          id: "provider-controls",
          title: "Revoke access at the provider",
          content: (
            <>
              <p>You can independently remove PostForge from TikTok, Instagram, or Google/YouTube through that provider&apos;s connected-app, website-permissions, or third-party-access settings. Provider-side revocation stops future API access but does not by itself remove data already stored in the PostForge deployment; complete the local deletion step as well.</p>
            </>
          ),
        },
        {
          id: "no-access",
          title: "If you cannot access the deployment",
          content: (
            <>
              <p>Send the deletion request to <a href="mailto:idriss.kone@icloud.com">idriss.kone@icloud.com</a>. Identify the provider and account you want removed, but do not send passwords, access tokens, recovery codes, or other credentials.</p>
            </>
          ),
        },
        {
          id: "what-is-deleted",
          title: "What the deletion covers",
          content: (
            <>
              <p>Account deletion removes the selected provider connection, encrypted access and refresh tokens, cached owned-media metrics, and provider-linked recovery records held by PostForge. A deleted connection cannot be used for new publishing.</p>
              <p className="mt-3">YouTube automation bindings to the deleted account are cleared automatically. TikTok and Instagram automation settings are separate workspace records and may retain the selected account identifier or label until the operator edits or deletes those automations.</p>
              <p className="mt-3">Generated media, prompts, uploaded source files, cost records, and other workspace content are also separate from a social connection and are not deleted by disconnecting an account. The operator must delete that workspace content or remove the deployment and its storage separately.</p>
            </>
          ),
        },
        {
          id: "timing",
          title: "Timing and provider retention",
          content: (
            <>
              <p>Local provider data is deleted immediately after a successful disconnect or confirmed permanent local deletion. YouTube API data is also subject to PostForge&apos;s 30-day freshness limit. TikTok, Instagram, Google, hosting, storage, and model providers may retain their own records under their respective policies.</p>
            </>
          ),
        },
      ]}
    />
  );
}


const orderedListClass = "mt-3 list-decimal space-y-3 pl-5 marker:font-semibold marker:text-[var(--pf-ink)]";