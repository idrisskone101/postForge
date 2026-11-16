import assert from "node:assert/strict";
import { buildVideoInput } from "../../src/lib/ai/generate-video";

assert.deepEqual(
  buildVideoInput("kling-4.0", { prompt: "A rooftop", model: "kling-4.0", duration: 10 }),
  { prompt: "A rooftop", duration: 10, resolution: "720p", aspect_ratio: "9:16" }
);

assert.deepEqual(
  buildVideoInput("kling-4.0-i2v", {
    prompt: "Turn around",
    model: "kling-4.0-i2v",
    aspectRatio: "16:9",
    inputImageUrl: "https://example.com/frame.png",
  }),
  {
    prompt: "Turn around",
    duration: 5,
    resolution: "720p",
    start_image_url: "https://example.com/frame.png",
  }
);

assert.deepEqual(
  buildVideoInput("seedance-2.5", {
    prompt: "Octopus football",
    model: "seedance-2.5",
    duration: 12,
    aspectRatio: "16:9",
    enableAudio: true,
  }),
  {
    prompt: "Octopus football",
    duration: "12",
    resolution: "720p",
    aspect_ratio: "16:9",
    generate_audio: true,
  }
);

assert.deepEqual(
  buildVideoInput("seedance-2.5-i2v", {
    prompt: "Wave",
    model: "seedance-2.5-i2v",
    inputImageUrl: "https://example.com/frame.png",
  }),
  {
    prompt: "Wave",
    duration: "8",
    resolution: "720p",
    image_url: "https://example.com/frame.png",
    generate_audio: false,
  }
);

assert.deepEqual(
  buildVideoInput("minimax-h3-max", { prompt: "Kitten", model: "minimax-h3-max" }),
  {
    prompt: "Kitten",
    duration: 5,
    resolution: "768P",
    prompt_expansion_mode: "balanced",
    aspect_ratio: "9:16",
  }
);

assert.deepEqual(
  buildVideoInput("wan-3.0", { prompt: "Panda", model: "wan-3.0", enableAudio: false }),
  { prompt: "Panda", duration: 5, resolution: "720p", aspect_ratio: "9:16", audio: false }
);

assert.deepEqual(
  buildVideoInput("flux-3-video", { prompt: "Fox", model: "flux-3-video", enableAudio: true }),
  {
    prompt: "Fox",
    duration: 5,
    resolution: "720p",
    safety_tolerance: 4,
    aspect_ratio: "9:16",
    generate_audio: true,
  }
);

assert.deepEqual(
  buildVideoInput("pixverse-v6", { prompt: "Girl", model: "pixverse-v6", enableAudio: true }),
  {
    prompt: "Girl",
    duration: 5,
    resolution: "720p",
    aspect_ratio: "9:16",
    generate_audio_switch: true,
  }
);

assert.deepEqual(
  buildVideoInput("gemini-omni-flash-1.2", { prompt: "Lighthouse", model: "gemini-omni-flash-1.2" }),
  { prompt: "Lighthouse", duration: 8, resolution: "720p", aspect_ratio: "9:16" }
);

assert.deepEqual(
  buildVideoInput("kling-3.0", { prompt: "Legacy", model: "kling-3.0" }),
  { prompt: "Legacy", duration: "5", aspect_ratio: "9:16" },
  "Kling 3.0 keeps its string duration"
);

console.log("generate-video payload tests passed");
