import * as fs from "fs/promises";
import * as path from "path";
import { analyzeImageWithGemini } from "./gemini-client";

export interface ScenePromptJSON {
  subject: {
    description: string;
    expression: string;
    skin: string;
    pose: string;
  };
  camera: {
    device: string;
    angle: string;
    focus: string;
    framing: string;
    quality: string;
  };
  scene: {
    environment: string;
    depth: string;
    objects: string;
    atmosphere: string;
  };
  lighting: {
    source: string;
    quality: string;
    shadows: string;
    highlights: string;
  };
  clothing: {
    outfit: string;
    style: string;
    accessories: string;
  };
  tiktok_aesthetic: {
    vibe: string;
    color_grading: string;
    texture: string;
    imperfections: string;
    feel: string;
  };
  compositing: {
    instruction: string;
    lighting_match: string;
    perspective: string;
    integration: string;
  };
  text_overlays: {
    detected: string;
    instruction: string;
  };
  style: string;
  negative: string;
}

const SCENE_ANALYSIS_PROMPT = `You are analyzing a TikTok video frame to generate a detailed JSON prompt for an AI image generation model. The generated image will composite a different person (provided separately as a reference image) into the scene you describe.

The goal is to produce an image that looks like an unedited iPhone front-facing camera selfie — the kind of casual, unstaged photo that lives in someone's camera roll. Not degraded or terrible quality, just clearly NOT professional. Think: real person in their bedroom about to record a TikTok.

CRITICAL PERSPECTIVE RULE:
TikTok videos are recorded using the iPhone FRONT-FACING (selfie) CAMERA. This means:
- The camera IS the phone. The viewer is looking FROM the phone AT the person.
- The phone is NEVER visible in the frame — it is behind the camera.
- NO hands holding a phone should ever appear. If you see the person's hand near the camera, they are gesturing, NOT holding a visible phone.
- Describe the pose as "facing the front-facing camera" or "looking into the selfie camera", NEVER as "holding a phone".

IMPORTANT RULES:
1. IGNORE all text overlays, captions, watermarks, hashtags, TikTok UI elements, and username text. Describe ONLY the underlying visual scene.
2. Describe the scene, lighting, camera angle, and environment in detail so the AI model can recreate it.
3. The "subject" section should describe what the person in the frame is DOING (pose, expression, gesture) — NOT their identity/appearance, since we'll be replacing them with the reference person.
4. Output ONLY valid JSON with no markdown formatting, no code fences, no explanation.

Output this exact JSON structure:
{
  "subject": {
    "description": "What the person is doing — pose, gesture, activity. NEVER mention holding a phone — the phone is the camera taking this photo.",
    "expression": "Facial expression and mood — casual and unposed. Mouth may be slightly open mid-speech, eyes relaxed, direct gaze into camera or looking slightly off. NOT a practiced influencer expression.",
    "skin": "Bare natural skin as seen through iPhone front camera. No makeup or minimal makeup. Visible pores on nose and cheeks at normal viewing distance. Slight natural shine on forehead and nose. Minor under-eye shadows. Uneven skin tone — slightly darker or redder in some areas. Lips natural color, possibly slightly dry. Apple's computational processing smooths skin subtly but does NOT erase texture. This is NOT airbrushed or poreless — it's just normal skin on a phone camera.",
    "pose": "Body position. If arms are raised, they are gesturing or the arm is cropped at frame edge (holding the phone behind the camera). Do NOT describe anyone holding or looking at a phone."
  },
  "camera": {
    "device": "iPhone front-facing camera, 12MP f/2.2 wide-angle ~23mm equivalent lens.",
    "angle": "Camera angle relative to the subject's face (e.g. slightly below chin level, at eye level, slightly above). Typical selfie angles — often at or slightly above eye level.",
    "focus": "Overall slightly soft — the front camera is less sharp than the rear camera. Focus is acceptable but not crisp. No true optical bokeh — if background is blurred it's computational with slightly artificial edge separation.",
    "framing": "Typical selfie distance — arm's length or propped up. Head and upper chest/shoulders fill most of the frame. Wide-angle lens captures more background than expected.",
    "quality": "iPhone front camera quality — decent but clearly a phone selfie, not a professional photo. Slightly soft focus overall. Flat rendering compared to rear camera. Smart HDR lifts shadows and tames highlights, creating a slightly flat tonal range. Slight warm color cast from auto white balance."
  },
  "scene": {
    "environment": "Detailed description of the setting — usually a casual everyday space like a bedroom, bathroom, living room, car, kitchen. Describe what makes it feel lived-in and real.",
    "depth": "Background depth — usually a wall or room behind the person. Describe whether it's close or far, and how much of the room is visible.",
    "objects": "Notable objects visible — bed, pillows, shelves, etc. Everyday clutter if present. Do NOT include a phone as an object.",
    "atmosphere": "Overall feel — casual, unstaged, personal. The kind of space where someone just grabs their phone and talks."
  },
  "lighting": {
    "source": "Whatever ambient light is already in the room — window daylight, overhead ceiling light, or both. NOT professional lighting. Describe the direction and whether it's even or uneven across the face.",
    "quality": "Flat ambient light — soft and diffuse, not dramatic. Often slightly warm from mixed indoor/daylight sources. No intentional lighting setup.",
    "shadows": "Soft, minimal shadows. Maybe a gentle shadow under the chin or nose from overhead light. One side of the face may be slightly brighter than the other from the window direction. Nothing dramatic.",
    "highlights": "Slight overexposure on bright areas like white walls behind the subject — Smart HDR tries to control this but the wall may still appear blown out. Natural skin highlights on forehead/nose from ambient light, not from a ring light or studio setup."
  },
  "clothing": {
    "outfit": "What the person is wearing — describe it as you see it. Usually casual, everyday clothing. Oversized t-shirts, hoodies, tank tops, loungewear. May show bra straps, wrinkled fabric, worn/faded material.",
    "style": "Casual, unplanned — wearing whatever they already had on. NOT styled for camera.",
    "accessories": "Any accessories visible — small earrings, hair ties, etc. Minimal or none."
  },
  "tiktok_aesthetic": {
    "vibe": "Casual UGC creator in their own space. Not trying to look good for the camera — just grabbed the phone and started talking. The environment isn't cleaned up or staged. Hair may be messy or air-dried. No ring light, no tripod, no backdrop.",
    "color_grading": "No color grading whatsoever. iPhone auto white balance — slightly warm under indoor light, neutral to slightly cool near windows. Smart HDR creates slightly lifted/washed shadows and controlled highlights. Skin tones are natural but imperfect — slightly warm or slightly uneven depending on the lighting. Colors are muted and natural, not vibrant or saturated.",
    "texture": "Slightly soft overall — characteristic of the iPhone front camera which is lower resolution and sharpness than the rear. Fine detail in hair and fabric is a bit mushy, not crisp. No heavy noise or grain in good light, but not clean/smooth either. Just normal phone camera texture.",
    "imperfections": "Natural imperfections that come from zero preparation: messy or air-dried hair with flyaways, slightly uneven lighting across the face, bare skin with visible pores and natural shine, under-eye shadows, subtle wide-angle distortion on features closest to the lens edges. These should be PRESENT but SUBTLE — not exaggerated.",
    "feel": "This should look like a frame grabbed from someone's front camera — the kind of image that exists in the camera roll between screenshots and food photos. Completely unstaged, unlit, unedited. Normal."
  },
  "compositing": {
    "instruction": "Place the reference image person naturally into this exact scene, as if THEY are the one being recorded by the front-facing selfie camera. Match the pose and framing. No phone should be visible — the phone IS the camera. The person should be looking directly into the camera lens.",
    "lighting_match": "Face lighting should match the ambient light direction and color temperature of the scene exactly. If the light comes from a window to the left, the left side of the face should be slightly brighter.",
    "perspective": "Selfie camera perspective — arm's length or propped-up distance, the phone is never visible in frame. Slight wide-angle distortion is expected.",
    "integration": "Skin tone should look natural under the scene's lighting. No obvious compositing edges. The person should look like they belong in this room."
  },
  "text_overlays": {
    "detected": "Yes/No — list any text overlays seen",
    "instruction": "IGNORE all text overlays. Do NOT reproduce any text, captions, watermarks, hashtags, or TikTok UI elements in the generated image."
  },
  "style": "Unedited iPhone front camera selfie. Shot on iPhone front-facing 12MP f/2.2 wide-angle. Slightly soft focus, flat tonal range from Smart HDR, natural warm color cast. Bare skin with real texture — visible pores, natural shine, no makeup or minimal makeup. Hair unstyled. Casual clothing. Ambient room lighting only — no ring light, no studio light. Background is a real lived-in space. This image should be indistinguishable from a real selfie in someone's camera roll.",
  "negative": "person holding phone, phone visible in frame, phone screen visible, looking at phone, deformed face, extra limbs, extra fingers, bad anatomy, blurry face, watermark, text overlay, caption text, hashtag text, TikTok UI, username watermark, collage, cartoon, anime, illustration, 3D render, studio lighting, professional DSLR, mirrorless camera, ring light, ring light reflection, softbox, beauty dish, beauty lighting, three-point lighting, overly retouched, plastic skin, poreless skin, airbrushed skin, glossy magazine skin, stock photo, fashion photography, editorial look, beauty shot, oversaturated, HDR look, perfectly sharp, tack sharp, 8K, ultra detailed, hyper-realistic render, flawless skin, perfect skin, beauty filter, FaceTune, color graded, cinematic color, film look"
}`;

/**
 * Analyzes a TikTok video frame using Gemini Flash and produces a detailed
 * JSON scene prompt for nano-banana-2's edit endpoint.
 */
export async function analyzeSceneAndBuildPrompt(
  frameImagePath: string,
  userPrompt?: string
): Promise<{
  promptJson: ScenePromptJSON;
  promptString: string;
  negativePrompt: string;
}> {
  const imageBuffer = await fs.readFile(frameImagePath);
  const ext = path.extname(frameImagePath).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : "image/jpeg";

  const rawResponse = await analyzeImageWithGemini(
    imageBuffer,
    mimeType,
    SCENE_ANALYSIS_PROMPT
  );

  // Strip any markdown code fences if Gemini wraps the JSON
  const cleaned = rawResponse
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const promptJson: ScenePromptJSON = JSON.parse(cleaned);

  // Inject user prompt into compositing instructions if provided
  if (userPrompt?.trim()) {
    promptJson.compositing.instruction += ` Additional instructions: ${userPrompt.trim()}`;
  }

  const promptString = buildNaturalLanguagePrompt(promptJson);
  const negativePrompt = promptJson.negative;

  return { promptJson, promptString, negativePrompt };
}

/**
 * Converts the structured Gemini JSON analysis into a natural language prompt
 * that nano-banana-2 can interpret effectively. Sending raw JSON.stringify()
 * produces AI-looking outputs; natural language with iPhone camera tokens
 * triggers the model's photorealistic training weights.
 */
function buildNaturalLanguagePrompt(json: ScenePromptJSON): string {
  // Random iPhone-style filename — triggers "real photo" associations
  // from the model's training data (millions of real photos had these filenames).
  const imgNum = Math.floor(Math.random() * 9000) + 1000;
  const heicPrefix = `IMG_${imgNum}.HEIC`;

  const parts: string[] = [
    heicPrefix,

    // Face swap instruction — must be explicit and early
    `Use the face from the uploaded reference image exactly as-is. Keep the facial bone structure, eye color, eyebrow shape, and skin texture 100% consistent with the reference. Place this person naturally into the scene below.`,

    // Scene & environment (from Gemini analysis)
    json.scene.environment,
    json.scene.objects !== "None" && json.scene.objects !== "none"
      ? json.scene.objects
      : "",
    json.scene.atmosphere,

    // Subject pose & expression (what the person is doing, not who they are)
    json.subject.description,
    json.subject.expression,
    json.clothing.outfit,

    // Lighting (critical for matching)
    json.lighting.source,
    json.lighting.quality,
    json.lighting.shadows,

    // Camera & iPhone authenticity
    `Shot on iPhone front-facing camera, 12MP f/2.2 wide-angle.`,
    json.camera.angle,
    json.camera.framing,

    // iPhone front camera characteristics — natural, unpolished, not degraded
    `Slightly soft focus throughout, flat tonal range from Smart HDR.`,
    `Real bare skin — visible pores, natural shine on forehead and nose, uneven skin tone, no makeup.`,
    `Ambient room lighting only, no ring light, no studio light.`,
    json.tiktok_aesthetic.imperfections,
    json.tiktok_aesthetic.color_grading,

    // Compositing integration
    json.compositing.lighting_match,
    json.compositing.integration,

    // User instructions (already appended to compositing.instruction)
    json.compositing.instruction.includes("Additional instructions:")
      ? json.compositing.instruction.split("Additional instructions:")[1].trim()
      : "",

    // No text overlays
    `No text, no captions, no watermarks, no UI elements.`,
  ];

  return parts.filter(Boolean).join(". ").replace(/\.\./g, ".").replace(/\s+/g, " ").trim();
}
