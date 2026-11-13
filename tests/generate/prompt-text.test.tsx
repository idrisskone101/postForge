import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { JobPromptText } from "../../src/app/(app)/generate/job-prompt-text";

const structured = renderToStaticMarkup(
  <JobPromptText prompt={JSON.stringify({ task: "Shoot a matte notebook on an oak desk.", camera: { lens: "26mm" } })} />,
);
assert.match(structured, /<p[^>]*line-clamp-6[^>]*>Shoot a matte notebook on an oak desk\.<\/p>/, "the task sentence leads, clamped to six lines");
assert.match(structured, /aria-expanded="false"[^>]*>Show full prompt<\/button>/);
assert.doesNotMatch(structured, /26mm/, "the full record waits for Show full prompt");
assert.doesNotMatch(structured, /overflow-y|overflow-auto/, "the prompt never scrolls inside the inspector");

const plain = renderToStaticMarkup(<JobPromptText prompt="Close-up of a hand placing a notebook." />);
assert.match(plain, /<p[^>]*line-clamp-6[^>]*>Close-up of a hand placing a notebook\.<\/p>/);
assert.doesNotMatch(plain, /Show full prompt/, "a prompt that fits shows no toggle");
