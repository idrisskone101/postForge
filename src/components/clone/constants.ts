import type { CloneSetupStep } from "@/components/clone/types";

export const IDENTITY_ROLE_LABELS: Record<string, string> = {
  front: "Front",
  threeQuarterLeft: "3/4 Left",
  threeQuarterRight: "3/4 Right",
  expressionNeutralOrSmile: "Expression",
  hairDown: "Hair down",
  halfUpHalfDown: "Half ponytail",
  ponytail: "Ponytail",
  bunUpdo: "Bun / updo",
};

export const UGC_CLONE_TIPS = [
  {
    title: "Start with the cleanest hook",
    body: "Pick a source where the first 1-2 seconds clearly show the face, motion, and spoken setup you want to preserve.",
  },
  {
    title: "Trim before you generate",
    body: "Cut dead air, jump cuts, and outro moments so motion control focuses on the useful part of the clip.",
  },
  {
    title: "Use a front-facing identity",
    body: "Choose an avatar with a clear face, even lighting, and minimal accessories for stronger identity transfer.",
  },
  {
    title: "Anchor the visual style",
    body: "Add a 9:16 reference that matches the lighting and framing you want in the final clone.",
  },
  {
    title: "Keep audio only when it helps",
    body: "Preserve original sound for timing and delivery; turn it off when the source audio is noisy or off-brand.",
  },
  {
    title: "Remove overlays early",
    body: "Strip heavy captions or stickers before generation when they cover faces, hands, or product motion.",
  },
  {
    title: "Use Pro for hard motion",
    body: "Move up to the Pro video model when the source has fast gestures, dance movement, or frequent face turns.",
  },
  {
    title: "Review reference before video",
    body: "A strong reference still reduces wasted video runs because identity, lighting, and framing are checked first.",
  },
] as const;

export const UGC_CLONE_TIP_INDEX_KEY = "postforge:ugc-clone:tip-index";
export const REFERENCE_BATCH_OPTIONS = [1, 2, 3] as const;
export type ReferenceBatchSize = (typeof REFERENCE_BATCH_OPTIONS)[number];

export const CLONE_SETUP_STEPS = [
  {
    id: "source",
    number: "01",
    label: "Source",
    shortLabel: "Source",
    description: "Choose and trim the clip",
  },
  {
    id: "identity",
    number: "02",
    label: "Identity",
    shortLabel: "Who",
    description: "Choose who appears",
  },
  {
    id: "reference",
    number: "03",
    label: "Reference",
    shortLabel: "Look",
    description: "Set the final look",
  },
] as const satisfies readonly {
  id: CloneSetupStep;
  number: string;
  label: string;
  shortLabel: string;
  description: string;
}[];

export function formatIdentityRole(role: string) {
  return IDENTITY_ROLE_LABELS[role] ?? role;
}
