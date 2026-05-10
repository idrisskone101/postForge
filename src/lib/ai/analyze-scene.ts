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
    position: string;
    distance: string;
    focus: string;
    framing: string;
    hand_visibility: string;
    selfie_constraint: string;
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
- Preserve the exact first-frame camera geometry: height, tilt, distance, crop, lens distortion, and horizon/roll. Do not reinterpret the shot as a rear-camera portrait, tripod shot, or professional camera angle.
- Count the visible hands/arms in the source frame. If the source appears handheld at arm's length, it is physically unlikely for both hands to be fully visible; one camera-side arm should be off-frame or cropped unless both hands are clearly visible in the source frame.

IMPORTANT RULES:
1. IGNORE all text overlays, captions, watermarks, hashtags, TikTok UI elements, and username text. Describe ONLY the underlying visual scene.
2. Describe the scene, lighting, camera angle, and environment in detail so the AI model can recreate it.
3. The "subject" section should describe ONLY what the person is DOING (pose, gesture, body position) — NOT their appearance. Do NOT describe hair color, hair style, skin tone, face shape, eye color, body type, or any physical characteristics of the person in the frame. The ENTIRE person will be replaced by a reference image — face, hair, body, everything.
4. Output ONLY valid JSON with no markdown formatting, no code fences, no explanation.

Output this exact JSON structure:
{
  "subject": {
    "description": "What the person is doing — pose, gesture, activity ONLY. Do NOT describe their hair, skin, face, or any physical features — those will come from a separate reference image. NEVER mention holding a phone — the phone is the camera taking this photo.",
    "expression": "Describe ONLY the type of expression (smiling, neutral, talking, laughing) — do NOT describe facial features, skin details, or hair.",
    "skin": "Leave this as: 'Determined by avatar reference image'",
    "pose": "Body position and gesture ONLY. If arms are raised, they are gesturing or the arm is cropped at frame edge (holding the phone behind the camera). Do NOT describe anyone holding or looking at a phone. Do NOT describe body type, hair, or physical appearance."
  },
  "camera": {
    "device": "iPhone front-facing camera, 12MP f/2.2 wide-angle ~23mm equivalent lens.",
    "angle": "Camera angle relative to the subject's face (e.g. slightly below chin level, at eye level, slightly above). Typical selfie angles — often at or slightly above eye level.",
    "position": "Exact camera position from the first frame: height relative to eyes/chin, left/right offset, tilt up/down, roll/horizon, and whether the phone is close, arm's length, or propped.",
    "distance": "Exact subject-to-camera distance and crop. State whether this is close selfie distance, arm's-length selfie distance, or propped front-camera distance.",
    "focus": "Overall slightly soft — the front camera is less sharp than the rear camera. Focus is acceptable but not crisp. No true optical bokeh — if background is blurred it's computational with slightly artificial edge separation.",
    "framing": "Typical selfie distance — arm's length or propped up. Head and upper chest/shoulders fill most of the frame. Wide-angle lens captures more background than expected.",
    "hand_visibility": "How many hands/arms are actually visible in the source frame, where they are, and whether any are cropped by the frame edge. Do not invent extra visible hands.",
    "selfie_constraint": "Physical constraint implied by the camera setup. If handheld, one hand/arm is holding the phone outside the frame and both hands should not be fully visible unless the source clearly shows both hands. If propped, both hands may be visible only if the source frame shows them.",
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
    "vibe": "Casual UGC creator in their own space. Not trying to look good for the camera — just grabbed the phone and started talking. The environment isn't cleaned up or staged. No ring light, no tripod, no backdrop.",
    "color_grading": "No color grading whatsoever. iPhone auto white balance — slightly warm under indoor light, neutral to slightly cool near windows. Smart HDR creates slightly lifted/washed shadows and controlled highlights. Skin tones are natural but imperfect — slightly warm or slightly uneven depending on the lighting. Colors are muted and natural, not vibrant or saturated.",
    "texture": "Slightly soft overall — characteristic of the iPhone front camera which is lower resolution and sharpness than the rear. Fine detail in hair and fabric is a bit mushy, not crisp. No heavy noise or grain in good light, but not clean/smooth either. Just normal phone camera texture.",
    "imperfections": "Natural imperfections from zero preparation: slightly uneven lighting across the face, subtle wide-angle distortion on features closest to the lens edges. Do NOT describe hair or skin appearance — those come from the avatar reference image.",
    "feel": "This should look like a frame grabbed from someone's front camera — the kind of image that exists in the camera roll between screenshots and food photos. Completely unstaged, unlit, unedited. Normal."
  },
  "compositing": {
    "instruction": "Place the reference image person — with ALL of their physical characteristics (face, hair, body type, skin tone) — naturally into this exact scene, as if THEY are the one being recorded by the front-facing selfie camera. Use THEIR hair, not the original subject's hair. Match the pose and framing only. No phone should be visible — the phone IS the camera.",
    "lighting_match": "Face lighting should match the ambient light direction and color temperature of the scene exactly. If the light comes from a window to the left, the left side of the face should be slightly brighter.",
    "perspective": "Selfie camera perspective — arm's length or propped-up distance, the phone is never visible in frame. Slight wide-angle distortion is expected.",
    "integration": "The avatar person's natural skin tone and hair should look natural under the scene's lighting. No obvious compositing edges. The person should look like they belong in this room."
  },
  "text_overlays": {
    "detected": "Yes/No — list any text overlays seen",
    "instruction": "IGNORE all text overlays. Do NOT reproduce any text, captions, watermarks, hashtags, or TikTok UI elements in the generated image."
  },
  "style": "Unedited iPhone front camera selfie. Shot on iPhone front-facing 12MP f/2.2 wide-angle. Slightly soft focus, flat tonal range from Smart HDR, natural warm color cast. The person's face, hair, and body must exactly match the first reference image (the avatar). Ambient room lighting only — no ring light, no studio light. Background is a real lived-in space. This image should be indistinguishable from a real selfie in someone's camera roll.",
  "negative": "person holding phone, phone visible in frame, phone screen visible, looking at phone, both hands fully visible in a handheld selfie when the source frame does not show both hands, invented extra hands, extra limbs, extra fingers, wrong camera angle, changed camera height, changed camera distance, changed crop, tripod shot, rear camera portrait, over-the-shoulder angle, deformed face, bad anatomy, blurry face, watermark, text overlay, caption text, hashtag text, TikTok UI, username watermark, collage, cartoon, anime, illustration, 3D render, studio lighting, professional DSLR, mirrorless camera, ring light, ring light reflection, softbox, beauty dish, beauty lighting, three-point lighting, overly retouched, plastic skin, poreless skin, airbrushed skin, glossy magazine skin, stock photo, fashion photography, editorial look, beauty shot, oversaturated, HDR look, perfectly sharp, tack sharp, 8K, ultra detailed, hyper-realistic render, flawless skin, perfect skin, beauty filter, FaceTune, color graded, cinematic color, film look"
}`;

/**
 * Analyzes a TikTok video frame using Gemini Flash and produces a detailed
 * JSON scene prompt for nano-banana-2's edit endpoint.
 */
export async function analyzeSceneAndBuildPrompt(
  frameImagePath: string,
  userPrompt?: string,
  options?: { poseEmphasis?: boolean }
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

  const promptString = buildNaturalLanguagePrompt(
    promptJson,
    options?.poseEmphasis,
    userPrompt
  );
  const negativePrompt = promptJson.negative;

  return { promptJson, promptString, negativePrompt };
}

/**
 * Converts the structured Gemini JSON analysis into a natural language prompt
 * that nano-banana-2 can interpret effectively. Sending raw JSON.stringify()
 * produces AI-looking outputs; natural language with iPhone camera tokens
 * triggers the model's photorealistic training weights.
 */
const TRENDY_AVATAR_OUTFITS = [
  "a sage green fitted baby tee with relaxed high-waisted jeans and small gold jewelry",
  "a cherry red square-neck bodysuit with loose vintage-wash jeans",
  "a powder blue cropped zip-up jacket over a simple fitted tee with casual denim",
  "a butter yellow wrap top with relaxed high-waisted trousers and subtle gold accessories",
  "a black fitted mock-neck top with olive cargo pants and delicate earrings",
  "a soft lavender cropped hoodie with clean wide-leg sweatpants",
  "a denim overshirt worn open over a fitted white tee with straight-leg jeans",
  "a rose pink off-shoulder top with high-waisted trousers",
  "a fitted emerald ribbed tank with a lightweight oversized button-down worn open",
  "a cobalt blue athletic half-zip with black bike shorts and minimal jewelry",
  "a cute striped baby tee with relaxed denim and small hoop earrings",
  "a chocolate brown square-neck top with light-wash jeans and a simple necklace",
  "a coral cropped tee with loose cream trousers and gold hoops",
  "a clean black bodysuit with a light denim jacket and relaxed jeans",
  "a soft mint satin cami layered under an open linen shirt with casual denim",
  "a burgundy long-sleeve wrap top with relaxed black trousers",
] as const;

function pickTrendyAvatarOutfit(originalOutfit: string): string {
  const normalized = originalOutfit.toLowerCase();
  const avoidSoftLayers = /cardigan|sweater|sweatshirt|hoodie|knit|fuzzy|fleece/.test(normalized);
  const avoidTanks = /tank|cami|sleeveless/.test(normalized);
  const avoidWhiteNeutral = /white|cream|beige|ivory|neutral|tan/.test(normalized);

  const candidates = TRENDY_AVATAR_OUTFITS.filter((outfit) => {
    const value = outfit.toLowerCase();
    if (avoidSoftLayers && /cardigan|sweater|sweatshirt|hoodie|knit|fuzzy|fleece/.test(value)) {
      return false;
    }
    if (avoidTanks && /tank|cami|sleeveless/.test(value)) {
      return false;
    }
    if (avoidWhiteNeutral && /white|cream|beige|neutral|tan/.test(value)) {
      return false;
    }
    return true;
  });

  const pool = candidates.length > 0 ? candidates : TRENDY_AVATAR_OUTFITS;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

const BLOCKED_ACCESSORIES = [
  "glasses",
  "sunglasses",
  "headphones",
  "earbuds",
  "headset",
  "hat",
  "cap",
  "beanie",
  "hair clips",
  "scarf",
  "face mask",
  "wearable tech",
] as const;

function getAccessoryBan(userPrompt?: string): string {
  const normalizedPrompt = userPrompt?.toLowerCase() ?? "";
  const blockedAccessories = BLOCKED_ACCESSORIES.filter(
    (accessory) => !normalizedPrompt.includes(accessory)
  );

  if (blockedAccessories.length === 0) {
    return "";
  }

  return `Do NOT add ${blockedAccessories.join(", ")} unless the user explicitly asks for them.`;
}

function buildAccessoryInstruction(accessories: string, userPrompt?: string): string {
  const sourceAccessories = accessories.trim() || "none detected";
  const accessoryBan = getAccessoryBan(userPrompt);

  return [
    `IMPORTANT ACCESSORY REQUIREMENT: Do NOT copy wearable accessories from the original TikTok subject.`,
    `Original visible wearable accessories were: ${sourceAccessories}.`,
    `The AI avatar should have a fresh, minimal accessory styling: small earrings, a delicate necklace, or no accessories.`,
    accessoryBan,
    accessoryBan
      ? `If the original TikTok subject has blocked accessories, the AI avatar MUST NOT have those accessories.`
      : "",
  ].filter(Boolean).join(" ");
}

function buildCameraLockInstruction(json: ScenePromptJSON, poseEmphasis?: boolean): string {
  const prefix = poseEmphasis
    ? "CRITICAL FRAME-0 CAMERA MATCH REQUIREMENT"
    : "CRITICAL CAMERA MATCH REQUIREMENT";

  return [
    `${prefix}: The final reference image is the exact first frame for a motion-control video.`,
    `Recreate the camera viewpoint one-to-one: ${json.camera.device}`,
    `Camera angle: ${json.camera.angle}`,
    `Camera position: ${json.camera.position}`,
    `Camera distance/crop: ${json.camera.distance}`,
    `Framing: ${json.camera.framing}`,
    `Hand/arm visibility must match the source exactly: ${json.camera.hand_visibility}`,
    `Selfie physical constraint: ${json.camera.selfie_constraint}`,
    `Do NOT widen the shot, move the camera, straighten or re-angle the phone, switch to a rear-camera/tripod perspective, or invent a second fully visible hand if the source frame does not show it.`,
  ].join(" ");
}

function buildNaturalLanguagePrompt(
  json: ScenePromptJSON,
  poseEmphasis?: boolean,
  userPrompt?: string
): string {
  // Random iPhone-style filename — triggers "real photo" associations
  // from the model's training data (millions of real photos had these filenames).
  const imgNum = Math.floor(Math.random() * 9000) + 1000;
  const heicPrefix = `IMG_${imgNum}.HEIC`;
  const avatarOutfit = pickTrendyAvatarOutfit(json.clothing.outfit);

  // When poseEmphasis is true, we strongly emphasize the exact starting pose
  // from frame 0. This ensures the reference image matches the video's opening
  // frame, preventing the motion control model from interpolating between
  // a mismatched pose and the video's starting position.
  const poseInstruction = poseEmphasis
    ? `CRITICAL POSE REQUIREMENT: The person MUST be in this EXACT pose: ${json.subject.pose}. ${json.subject.description}. Their expression must be: ${json.subject.expression}. This is the starting frame of a motion-controlled video — the pose must match PRECISELY or the motion will be misaligned. Do not default to a neutral/static pose.`
    : "";

  const parts: string[] = [
    heicPrefix,

    // Full identity swap — identity references first, target scene frame last.
    `All reference images except the final one are the SAME person (the avatar). Use their ENTIRE appearance: face, facial structure, eye color, eyebrow shape, hair color, hair style, hair length, hair texture, skin tone, complexion, and body type. This is a full person replacement, not just a face swap. The hair MUST be the avatar's hair. The final reference image is the target TikTok frame — match its BACKGROUND, CAMERA ANGLE, LIGHTING, CROP, HAND VISIBILITY, and ENVIRONMENT exactly. Only adopt the POSE and BODY POSITION from the target TikTok frame. Everything about WHO the person IS comes from the avatar reference images.`,

    buildCameraLockInstruction(json, poseEmphasis),

    // Pose emphasis (when generating for motion control)
    poseInstruction,

    // Scene & environment (from Gemini analysis)
    json.scene.environment,
    json.scene.objects !== "None" && json.scene.objects !== "none"
      ? json.scene.objects
      : "",
    json.scene.atmosphere,

    // Subject pose ONLY — no appearance details (those come from avatar)
    json.subject.description,

    // Wardrobe should be new for each clone, not copied from the source creator.
    `IMPORTANT WARDROBE REQUIREMENT: Do NOT copy the original TikTok subject's outfit. The original visible outfit was: ${json.clothing.outfit}. Replace it with a different cute, trendy outfit for a woman in her 20s: ${avatarOutfit}. The replacement must visibly change the garment type, color family, texture/material, and styling from the original TikTok outfit while still fitting the same pose, crop, environment, and casual UGC realism. If the source outfit is white, cream, beige, fuzzy, knit, or cardigan-like, choose a more colorful and structurally different outfit. Avoid logos, text, captions, brand marks, uniforms, or anything that looks like a costume.`,
    buildAccessoryInstruction(json.clothing.accessories, userPrompt),

    // Lighting (critical for matching)
    json.lighting.source,
    json.lighting.quality,
    json.lighting.shadows,

    // Camera & iPhone authenticity
    `Shot on iPhone front-facing camera, 12MP f/2.2 wide-angle.`,
    json.camera.angle,
    json.camera.position,
    json.camera.distance,
    json.camera.framing,
    json.camera.hand_visibility,
    json.camera.selfie_constraint,

    // iPhone front camera characteristics — natural, unpolished, not degraded
    `Slightly soft focus throughout, flat tonal range from Smart HDR.`,
    `Ambient room lighting only, no ring light, no studio light.`,
    json.tiktok_aesthetic.color_grading,

    // Compositing integration
    json.compositing.lighting_match,

    // User instructions (already appended to compositing.instruction)
    json.compositing.instruction.includes("Additional instructions:")
      ? json.compositing.instruction.split("Additional instructions:")[1].trim()
      : "",

    // No text overlays
    [
      `No text, no captions, no watermarks, no UI elements.`,
      getAccessoryBan(userPrompt),
      `Do not add a second visible hand unless it is visible in the source frame.`,
    ].filter(Boolean).join(" "),
  ];

  return parts.filter(Boolean).join(". ").replace(/\.\./g, ".").replace(/\s+/g, " ").trim();
}
