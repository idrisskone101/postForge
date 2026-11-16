import type { PublicIntegrationStatus } from "@/lib/integrations-client";
import type { SocialProviderContent } from "./social-provider-content";

export function SetupDetail({
  id,
  open,
  content,
}: {
  id: string;
  open: boolean;
  content: SocialProviderContent;
}) {
  return (
    <div id={id} hidden={!open} className="wb-fade-in rounded-lg bg-raised px-4 py-3.5">
      <div className="flex flex-col gap-2.5">
        <span className="wb-label">Server setup</span>
        <p className="max-w-[68ch] break-words text-[13px] leading-5 text-fg-secondary [overflow-wrap:anywhere]">
          {content.setup}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          <ExternalLink href={content.documentation} strong>
            Setup documentation
          </ExternalLink>
          {content.policyLinks?.map((link) => (
            <ExternalLink key={link.href} href={link.href}>
              {link.label}
            </ExternalLink>
          ))}
        </div>
      </div>
    </div>
  );
}

export function YouTubeConsent({
  compliance,
  needsConsent,
  consent,
  onConsentChange,
}: {
  compliance: NonNullable<PublicIntegrationStatus["youtubeCompliance"]>;
  needsConsent: boolean;
  consent: boolean;
  onConsentChange: (accepted: boolean) => void;
}) {
  return (
    <div data-youtube-owner-policies className="flex flex-col gap-3 rounded-lg bg-raised px-4 py-3.5">
      <span className="wb-label">PostForge policies for YouTube API Services</span>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <ExternalLink href={compliance.privacyPolicyUrl} strong>Privacy Policy</ExternalLink>
        <ExternalLink href={compliance.termsUrl} strong>Terms</ExternalLink>
        <ExternalLink href={compliance.dataDeletionUrl} strong>Data deletion</ExternalLink>
      </div>
      {needsConsent && (
        <label className="flex cursor-pointer items-start gap-2.5 border-t border-raised-strong pt-3 text-[13px] leading-[18px] text-fg-secondary">
          <input
            type="checkbox"
            aria-label="Accept policies before connecting YouTube"
            checked={consent}
            onChange={(event) => onConsentChange(event.currentTarget.checked)}
            className="mt-px size-[18px] shrink-0 cursor-pointer accent-[var(--pf-ember)]"
          />
          <span>
            I have reviewed and accept PostForge&apos;s Privacy Policy and
            Terms. I also agree that using YouTube API Services means
            accepting YouTube&apos;s Terms of Service.
          </span>
        </label>
      )}
    </div>
  );
}

export function PolicyLinks({ links }: { links: NonNullable<SocialProviderContent["policyLinks"]> }) {
  return (
    <div className="-mt-1 flex flex-wrap gap-x-4 gap-y-1.5 pb-1">
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="rounded-sm text-xs font-medium leading-4 text-fg-muted underline-offset-2 transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:text-fg hover:underline"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

function ExternalLink({
  href,
  strong = false,
  children,
}: {
  href: string;
  strong?: boolean;
  children: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={
        strong
          ? "rounded-sm text-[13px] font-semibold leading-4 text-fg underline decoration-1 underline-offset-2"
          : "rounded-sm text-[13px] font-medium leading-4 text-fg-secondary underline-offset-2 transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:text-fg hover:underline"
      }
    >
      {children}
    </a>
  );
}
