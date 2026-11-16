import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { JobPromptText } from "../../src/app/(app)/generate/job-prompt-text";

const structured = renderToStaticMarkup(
  <JobPromptText prompt={JSON.stringify({ task: "Shoot a matte notebook on an oak desk.", camera: { lens: "26mm" } })} />,
);
assert.match(structured, /<p[^>]*line-clamp-6[^>]*>Shoot a matte notebook on an oak desk\.<\/p>/, "the task sentence leads, clamped to six lines");
assert.match(structured, /aria-expanded="false"[^>]*>Show full prompt<\/button>/);
assert.doesNotMatch(structured, /26mm/, "the full record waits for Show full prompt");
assert.doesNotMatch(structured, /overflow-y|overflow-auto/, "the prompt text carries no scroller of its own");

const plain = renderToStaticMarkup(<JobPromptText prompt="Close-up of a hand placing a notebook." />);
assert.match(plain, /<p[^>]*line-clamp-6[^>]*>Close-up of a hand placing a notebook\.<\/p>/);
assert.doesNotMatch(plain, /Show full prompt/, "a prompt that fits shows no toggle");

const panel = readFileSync("src/app/(app)/generate/job-inspector.tsx", "utf8");
assert.match(panel, /PROMPT_PANEL =\s*"[^"]*xl:flex-1[^"]*xl:has-\[\[aria-expanded=true\]\]:flex-none/, "the panel fills the inspector at rest and lets go once the full prompt is open");
assert.match(panel, /PROMPT_RECORD =\s*"[^"]*wb-scroll-fade-y[^"]*xl:overflow-y-auto/, "the clamped record scrolls with the fade so the action row keeps its place");
