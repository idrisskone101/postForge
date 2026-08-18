import assert from "node:assert/strict";
import {
  parseSlideshowProject,
  slideshowProjectWriteBody,
  slideshowTextColorHex,
  slideshowTextColorToken,
} from "../../src/lib/slideshow/project";
import { slideshowOverlayTextColor } from "../../src/lib/slideshow/text-overlay";
import { createBlankSlideshowProject } from "../../src/components/slideshow/fixtures";

const fromLegacyRole = parseSlideshowProject({
  id: "legacy",
  title: "Legacy",
  status: "exported",
  settings: {
    phaseSettings: {
      hook: { grid: "none", overlayEnabled: true, overlayOpacity: 40, displayText: true },
      body: { grid: "1:2", overlayEnabled: false, overlayOpacity: 10, displayText: false },
      cta: { grid: "none", overlayEnabled: true, overlayOpacity: 40, displayText: true },
    },
    textSettings: { color: "#ff7a59", size: undefined },
  },
  slides: [
    { kind: "hook", position: 0, content: { headline: "Hook" } },
    { role: "body", position: 1, content: { headline: "Point" } },
    { kind: "cta", position: 2, content: { headline: "CTA" } },
  ],
  updatedAt: new Date().toISOString(),
});

assert.equal(fromLegacyRole.slides[1].kind, "content");
assert.equal(fromLegacyRole.phaseSettings.content.grid, "1:2");
assert.equal(fromLegacyRole.phaseSettings.content.overlayEnabled, false);
assert.equal(fromLegacyRole.textSettings.color, "coral");
assert.equal(fromLegacyRole.textSettings.size, 56);
assert.equal(fromLegacyRole.status, "exported");

const written = slideshowProjectWriteBody(fromLegacyRole);
assert.equal("status" in written, false);
assert.equal(written.slides[1].kind, "content");
assert.ok(!("role" in written.slides[1]));
assert.ok(!("body" in written.settings.phaseSettings));
assert.ok("content" in written.settings.phaseSettings);
assert.equal(
  written.slides[0].settings.textColor,
  slideshowOverlayTextColor("coral"),
);

const draft = createBlankSlideshowProject();
const draftBody = slideshowProjectWriteBody(draft);
assert.equal(draftBody.status, "draft");
assert.equal(draft.slides[0].kind, "hook");
assert.equal(draft.phaseSettings.content.displayText, true);

assert.equal(slideshowTextColorToken("#ff8a6e"), "coral");
assert.equal(slideshowTextColorToken("#ff7a59"), "coral");
assert.equal(
  slideshowTextColorHex({
    font: "Poppins",
    color: "coral",
    style: "outline",
    size: 56,
    position: "center",
    width: 88,
    align: "center",
    padding: "padded",
    backgroundRadius: 4,
  }),
  slideshowOverlayTextColor("coral"),
);

console.log("slideshow project record tests passed");
