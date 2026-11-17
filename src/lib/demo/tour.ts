/**
 * The guided path through the demo workspace, shown on Home in a demo build.
 * Each stop opens the surface where that part of the campaign lives.
 */
export type DemoTourStop = {
  title: string;
  detail: string;
  href: string;
};

export const DEMO_TOUR: readonly DemoTourStop[] = [
  {
    title: "Meet the creators",
    detail: "Four AI creators, each with an identity pack so the same face holds in every shot.",
    href: "/characters",
  },
  {
    title: "One hook, three creators",
    detail: "A sample TikTok recreated by Marcus, Ava and Diego to test who lands it.",
    href: "/ugc-clone",
  },
  {
    title: "The carousel that won",
    detail: "Open Marcus's story in Drafts. It closes on a Saylo screen drawn by GPT Image 2.6.",
    href: "/slideshow",
  },
  {
    title: "Put it on a schedule",
    detail: "Weekly phrase drops run as review drafts. Nothing posts without approval.",
    href: "/automations",
  },
  {
    title: "See what worked",
    detail: "Sample post results from a CSV import, with the story post far ahead.",
    href: "/performance",
  },
  {
    title: "See what it cost",
    detail: "Every image, clip and identity pack here is logged at its model price.",
    href: "/costs",
  },
];
