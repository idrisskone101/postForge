import type { SocialProvider } from "@/lib/integrations-client";

export type SocialProviderContent = {
  description: string;
  setup: string;
  documentation: string;
  policyLinks?: Array<{ label: string; href: string }>;
};

export const PROVIDER_CONTENT: Record<SocialProvider, SocialProviderContent> = {
  tiktok: {
    description:
      "Read owned-post performance and explicitly publish an approved Gallery video after provider review.",
    setup:
      "Set server credentials and a public HTTPS POSTFORGE_PUBLIC_URL. Verify that domain or URL prefix in TikTok's developer portal and obtain video.publish approval; OAuth configuration alone is not sufficient.",
    documentation: "https://developers.tiktok.com/doc/login-kit-overview",
  },
  instagram: {
    description:
      "Read owned Reels and explicitly publish an approved Gallery video after provider review.",
    setup:
      "Set server credentials, a public HTTPS POSTFORGE_PUBLIC_URL reachable by Meta's crawler, and grant instagram_business_content_publish.",
    documentation:
      "https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login",
  },
  youtube: {
    description:
      "Read channel-owned metrics and explicitly upload an approved vertical video with editable metadata and privacy.",
    setup:
      "Publish your own Privacy Policy, Terms, and data-deletion instructions at public HTTPS URLs; set POSTFORGE_PRIVACY_POLICY_URL, POSTFORGE_TERMS_URL, POSTFORGE_DATA_DELETION_URL, and a strong CRON_SECRET for the daily provider-data retention job; configure the same disclosures on the Google OAuth consent screen; enable the YouTube Data API; grant youtube.upload; and complete any required Google verification. PostForge validates URL and retention-worker readiness only: it does not create legal disclosures, attest their contents, or claim provider approval.",
    documentation:
      "https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps",
    policyLinks: [
      {
        label: "YouTube Terms",
        href: "https://www.youtube.com/t/terms",
      },
      {
        label: "YouTube Community Guidelines",
        href: "https://www.youtube.com/howyoutubeworks/policies/community-guidelines/",
      },
      {
        label: "YouTube API Services Terms",
        href: "https://developers.google.com/youtube/terms/api-services-terms-of-service",
      },
      {
        label: "Google Privacy Policy",
        href: "https://policies.google.com/privacy",
      },
      {
        label: "Revoke Google access",
        href: "https://myaccount.google.com/permissions",
      },
    ],
  },
};
