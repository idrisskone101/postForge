import { demoId } from "./seed/seed-utils";

/**
 * The guided path through the demo workspace, shown on Home in a demo build.
 * Each stop opens a seeded item, and seeded ids are stable across restores,
 * so these links keep working. `tests/demo/seed.test.ts` checks the clone
 * stop still points at a seeded job.
 */
export const DEMO_TOUR_CLONE_PATH = "videos/seed/clone-marcus-waiter.mp4";
export const DEMO_TOUR_CLONE_JOB_ID = demoId(`job:${DEMO_TOUR_CLONE_PATH}`);

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
    href: `/ugc-clone/${DEMO_TOUR_CLONE_JOB_ID}`,
  },
  {
    title: "The carousel that won",
    detail: "Marcus's story slideshow, closing on a Saylo screen drawn by GPT Image 2.6.",
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
