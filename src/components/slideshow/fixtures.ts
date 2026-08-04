import type {
  SlideshowCollection,
  SlideshowPhase,
  SlideshowPhaseSettings,
  SlideshowProject,
  SlideshowSlide,
  SlideshowTemplate,
} from "./types";

const hook = (
  headline: string,
  visualKey: string,
  eyebrow = "A hard truth nobody says out loud",
): SlideshowTemplate["slides"][number] => ({
  role: "hook",
  eyebrow,
  headline,
  body: "Swipe for the part that changed everything.",
  prompt: "A specific, tension-led opening that feels conversational.",
  visualKey,
});

const body = (
  eyebrow: string,
  headline: string,
  bodyCopy: string,
  visualKey: string,
): SlideshowTemplate["slides"][number] => ({
  role: "body",
  eyebrow,
  headline,
  body: bodyCopy,
  prompt: "One concrete lesson with a believable example. Avoid generic advice.",
  visualKey,
});

const cta = (
  headline: string,
  visualKey: string,
): SlideshowTemplate["slides"][number] => ({
  role: "cta",
  eyebrow: "Keep the next step simple",
  headline,
  body: "Save this post so you can come back when you need it.",
  prompt: "Invite the reader to save the post and try one simple next step.",
  visualKey,
});

export const DEFAULT_SLIDESHOW_TEMPLATES: SlideshowTemplate[] = [
  {
    id: "product-truths",
    name: "Product truths",
    author: "PostForge",
    category: "Conversion",
    description: "A tension-led hook followed by short, specific lessons.",
    hook: "5 things I stopped believing after building my first app",
    visualKeys: ["coral-glow", "blue-studio", "night-grid"],
    slides: [
      hook(
        "5 things I stopped believing after building my first app",
        "coral-glow",
      ),
      body(
        "Belief #1",
        "More features do not make the first version more useful.",
        "The shortest path to one valuable outcome is usually the strongest launch.",
        "blue-studio",
      ),
      body(
        "Belief #2",
        "Your users notice friction before they notice polish.",
        "Fix the confusing step before adding another beautiful screen.",
        "lime-paper",
      ),
      body(
        "Belief #3",
        "A smaller promise can create a bigger habit.",
        "Make one action feel effortless enough to repeat tomorrow.",
        "night-grid",
      ),
      cta("Build the version people can understand in ten seconds.", "coral-wave"),
    ],
  },
  {
    id: "books-that-changed-me",
    name: "Books that changed me",
    author: "Format library",
    category: "Education",
    description: "A saveable list with one memorable takeaway per slide.",
    hook: "4 books that quietly changed how I see everything",
    visualKeys: ["paper-stack", "violet-dusk", "blue-studio"],
    slides: [
      hook(
        "4 books that quietly changed how I see everything",
        "paper-stack",
        "Worth keeping on your nightstand",
      ),
      body(
        "Book #1",
        "A better question can be more useful than a faster answer.",
        "This one changed the way I approach hard decisions.",
        "violet-dusk",
      ),
      body(
        "Book #2",
        "Small systems keep working after motivation leaves.",
        "I still use this idea every Sunday when I plan my week.",
        "blue-studio",
      ),
      cta("Pick one idea and try it before you buy another book.", "paper-stack"),
    ],
  },
  {
    id: "tiny-habits",
    name: "Tiny habits daily",
    author: "Format library",
    category: "Lifestyle",
    description: "Practical changes framed around time and emotional relief.",
    hook: "6 tiny habits that save me hours every week",
    visualKeys: ["mint-room", "sunset-blocks", "coral-glow"],
    slides: [
      hook("6 tiny habits that save me hours every week", "mint-room"),
      body(
        "Habit #1",
        "Put the recurring decision on the calendar once.",
        "You should not have to renegotiate the same task every day.",
        "sunset-blocks",
      ),
      body(
        "Habit #2",
        "Keep the next action visible, not the whole project.",
        "A tiny cue removes the energy it takes to restart.",
        "coral-glow",
      ),
      cta("Save this and choose the easiest habit first.", "mint-room"),
    ],
  },
  {
    id: "unpopular-advice",
    name: "Unpopular advice",
    author: "Format library",
    category: "Wellness",
    description: "A contrarian opener paired with calm, credible guidance.",
    hook: "The wellness advice I wish someone gave me sooner",
    visualKeys: ["lime-paper", "night-grid", "violet-dusk"],
    slides: [
      hook(
        "The wellness advice I wish someone gave me sooner",
        "lime-paper",
      ),
      body(
        "Start here",
        "Consistency should feel boring before it feels impressive.",
        "The routine that fits a normal day will beat the perfect plan.",
        "night-grid",
      ),
      body(
        "Remember",
        "Rest is part of the plan, not proof that you failed.",
        "A sustainable rhythm includes recovery before you need it.",
        "violet-dusk",
      ),
      cta("Keep the routine that leaves room for your actual life.", "lime-paper"),
    ],
  },
];

export const DEFAULT_SLIDESHOW_COLLECTIONS: SlideshowCollection[] = [
  {
    id: "lifestyle",
    name: "Lifestyle gradients",
    imageCount: 28,
    visualKeys: ["coral-glow", "mint-room", "violet-dusk", "paper-stack"],
  },
  {
    id: "founder",
    name: "Founder studio",
    imageCount: 14,
    visualKeys: ["blue-studio", "night-grid", "sunset-blocks", "coral-wave"],
  },
  {
    id: "wellness",
    name: "Calm wellness",
    imageCount: 19,
    visualKeys: ["lime-paper", "mint-room", "paper-stack", "violet-dusk"],
  },
];



const defaultPhaseSettings = (): Record<
  SlideshowPhase,
  SlideshowPhaseSettings
> => ({
  hook: {
    grid: "none",
    overlayEnabled: true,
    overlayOpacity: 38,
    displayText: true,
  },
  body: {
    grid: "none",
    overlayEnabled: true,
    overlayOpacity: 34,
    displayText: true,
  },
  cta: {
    grid: "none",
    overlayEnabled: true,
    overlayOpacity: 42,
    displayText: true,
  },
});

export function createProjectFromTemplate(
  template: SlideshowTemplate,
): SlideshowProject {
  const now = new Date().toISOString();
  const nonce = `${Date.now()}`;
  const slides: SlideshowSlide[] = template.slides.map((slide, index) => ({
    ...slide,
    id: `local-slide-${nonce}-${index + 1}`,
    order: index,
  }));

  return {
    id: `local-${nonce}`,
    clientId: `local-${nonce}`,
    title: template.name,
    status: "draft",
    aspectRatio: "9:16",
    slides,
    phaseSettings: defaultPhaseSettings(),
    textSettings: {
      font: "Poppins",
      color: "white",
      style: "outline",
      size: 28,
      position: "center",
      width: 88,
      align: "center",
    },
    includeCta: slides.some((slide) => slide.role === "cta"),
    preventRepeats: true,
    language: "English",
    templateId: template.id,
    createdAt: now,
    updatedAt: now,
  };
}

export function createBlankSlideshowProject(): SlideshowProject {
  return createProjectFromTemplate({
    id: "custom",
    name: "Untitled slideshow",
    author: "PostForge",
    category: "Custom",
    description: "A flexible blank slideshow.",
    hook: "Add a hook that earns the next swipe",
    visualKeys: ["coral-glow", "blue-studio", "lime-paper"],
    slides: [
      hook("Add a hook that earns the next swipe", "coral-glow"),
      body(
        "Point #1",
        "Make one clear, useful point on this slide.",
        "Add proof, an example, or the detail your audience needs.",
        "blue-studio",
      ),
      body(
        "Point #2",
        "Keep the story moving with a specific next idea.",
        "Short slides make the whole carousel easier to finish.",
        "lime-paper",
      ),
      cta("Give the reader one simple next step.", "coral-wave"),
    ],
  });
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
