import type { Metadata } from "next";
import { PublicPolicyPage } from "@/components/public-policy-page";

export const metadata: Metadata = {
  title: "Privacy Policy - PostForge",
  description: "How PostForge handles workspace, media, and connected social-account data.",
};

export default function PrivacyPage() {
  return (
    <PublicPolicyPage
      title="Privacy Policy"
      summary="This policy explains what data a PostForge deployment processes, why it is needed, where it is stored, and the controls available to the deployment operator and connected-account owners."
      effectiveDate="August 9, 2026"
      currentPath="/privacy"
      sections={[
        {
          id: "scope",
          title: "Scope and responsibility",
          content: (
            <>
              <p>PostForge is self-hosted software designed for a single operator. The person or organization running a deployment controls that deployment and is responsible for how it is configured and used. This policy covers data processed by the PostForge application itself; connected platforms and infrastructure providers apply their own privacy terms.</p>
            </>
          ),
        },
        {
          id: "data-we-process",
          title: "Data PostForge processes",
          content: (
            <>
              <p>Depending on the features the operator uses, a deployment may process:</p>
              <ul className={listClass}>
                <li>Prompts, uploaded images and videos, source links, generated media, captions, slideshow content, characters, collections, and review decisions.</li>
                <li>Operational records such as job status, model selection, timestamps, errors, automation settings, approval history, usage, and provider cost information.</li>
                <li>Connected social-account identifiers, display names, usernames, avatars, granted permissions, authorization status, token expiry, owned-media details, metrics, and publishing outcomes.</li>
                <li>OAuth access and refresh tokens. PostForge encrypts these tokens on the server and does not place them in browser storage, workspace feature records, logs, URLs, or client-visible responses.</li>
                <li>Limited browser preferences stored on the device, including theme, sidebar state, budget display, builder favorites, and dismissed interface tips.</li>
              </ul>
            </>
          ),
        },
        {
          id: "use",
          title: "How data is used",
          content: (
            <>
              <p>PostForge uses this data to generate and organize media, operate review and automation workflows, calculate spend, display connected-account performance, refresh authorization, recover interrupted jobs, and publish content only after the operator gives the required approval.</p>
              <p className="mt-3">PostForge does not sell personal data or use connected-account data for cross-context behavioral advertising. Unavailable provider metrics remain unavailable rather than being replaced with synthetic values.</p>
            </>
          ),
        },
        {
          id: "sharing",
          title: "Services that receive data",
          content: (
            <>
              <p>Data is sent only as needed to services the operator configures, such as AI-generation providers, database and media-storage infrastructure, source-import services, and connected platforms including TikTok, Instagram, and YouTube. A publishing request may send approved media, captions, account identifiers, and provider-required metadata to the selected destination.</p>
              <p className="mt-3">Those providers process data under their own terms. The deployment operator is responsible for selecting providers, configuring credentials, and deciding what content to submit.</p>
            </>
          ),
        },
        {
          id: "security-retention",
          title: "Security and retention",
          content: (
            <>
              <p>PostForge uses a production API-key boundary for private workspace routes, encrypts provider tokens at rest, uses short-lived single-use OAuth state, and keeps publishing as an explicit approval-gated mutation. No system can guarantee absolute security, so the operator must also secure the deployment, database, storage, provider accounts, and credentials.</p>
              <p className="mt-3">Workspace content remains until the operator deletes it or removes the deployment and its storage. Social connection data remains until it is disconnected, deleted, or expires under the applicable retention process. YouTube API data is refreshed or deleted before it becomes more than 30 days old.</p>
            </>
          ),
        },
        {
          id: "choices",
          title: "Your choices",
          content: (
            <>
              <p>Connected accounts can be disconnected from Settings → Integrations. PostForge attempts provider revocation before deleting the local encrypted connection and cached provider data. Account owners can also revoke access directly from the connected platform. See the <a href="/data-deletion" className="font-semibold text-[var(--pf-link)] underline-offset-4 hover:underline">Data Deletion Instructions</a> for the full process.</p>
            </>
          ),
        },
        {
          id: "children-changes-contact",
          title: "Children, changes, and contact",
          content: (
            <>
              <p>PostForge is not directed to children and is intended for an operator who is able to manage provider accounts and publishing permissions. This policy may change as the product or its configured providers change; the effective date above will be updated when material revisions are published.</p>
              <p className="mt-3">Questions or privacy requests can be sent to <a href="mailto:idriss.kone@icloud.com">idriss.kone@icloud.com</a>. Do not include passwords, access tokens, recovery codes, or other credentials.</p>
            </>
          ),
        },
      ]}
    />
  );
}


const listClass = "mt-3 list-disc space-y-2 pl-5 marker:text-[var(--pf-border-strong)]";