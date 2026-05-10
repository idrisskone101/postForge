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

const DEFAULT_NEGATIVE_PROMPT = [
  "person holding phone",
  "phone visible in frame",
  "phone screen visible",
  "looking at phone",
  "invented extra hands",
  "extra limbs",
  "extra fingers",
  "tripod shot",
  "rear camera portrait",
  "over-the-shoulder angle",
  "deformed face",
  "bad anatomy",
  "blurry face",
  "watermark",
  "text overlay",
  "caption text",
  "hashtag text",
  "TikTok UI",
  "username watermark",
  "collage",
  "cartoon",
  "anime",
  "illustration",
  "3D render",
  "studio lighting",
  "professional DSLR",
  "ring light",
  "softbox",
  "beauty lighting",
  "overly retouched",
  "plastic skin",
  "poreless skin",
  "stock photo",
  "fashion photography",
  "editorial look",
  "oversaturated",
  "HDR look",
  "tack sharp",
  "8K",
  "hyper-realistic render",
  "beauty filter",
  "FaceTune",
  "color graded",
  "cinematic color",
  "film look",
].join(", ");

const AVATAR_WARDROBE_INSTRUCTION =
  "Dress the avatar in a visibly different outfit from the TikTok subject. Choose a trendy, cute, age-appropriate Gen Z casual outfit a stylish 20-year-old woman would realistically wear. Keep the outfit current, flattering, fresh, and everyday-cute without copying the source subject's clothing silhouette, colors, logos, distinctive patterns, jewelry, or accessories.";

const WARDROBE_VARIATIONS = [
  "A fitted pastel baby tee with relaxed light-wash jeans, using soft fresh colors like butter yellow, baby blue, or blush pink.",
  "A cropped cardigan over a simple tank with flattering high-rise denim, using a cute color pairing like sage green with white, powder blue with cream, or cherry red with denim.",
  "A ribbed crop top or contour lounge top with loose cargos or wide-leg jeans, using a different color palette from the source such as heather gray with pink, cocoa with ivory, or teal with washed denim.",
  "A clean oversized sweatshirt or zip hoodie styled with bike shorts or casual jeans, using a playful Gen Z color like lavender, matcha green, sky blue, or soft coral.",
  "A fitted long-sleeve top or off-shoulder knit with straight-leg jeans, using attractive fresh colors like rose, slate blue, espresso brown, or crisp white with a contrasting accent.",
  "A cute casual tank or baby tee layered with an open lightweight shirt, using a bright but natural palette like tomato red, cobalt, mint, or sunny yellow balanced with denim.",
];

function pickWardrobeInstruction(): string {
  const variant =
    WARDROBE_VARIATIONS[Math.floor(Math.random() * WARDROBE_VARIATIONS.length)];

  return [
    AVATAR_WARDROBE_INSTRUCTION,
    `Specific outfit direction for this image: ${variant}`,
    "Use colors that are clearly different from the TikTok source outfit and avoid defaulting to the same black, white, beige, or gray palette unless it is part of a contrasting styled look.",
    "Add tasteful variety across regenerations while keeping the clothing believable for an everyday TikTok selfie.",
  ].join(" ");
}

function buildPromptJson(
  userPrompt?: string,
  wardrobeInstruction = AVATAR_WARDROBE_INSTRUCTION
): ScenePromptJSON {
  return {
    subject: {
      description:
        "Use the target TikTok frame as the visual source for pose, body position, gesture, and expression.",
      expression: "Inferred from the target TikTok frame.",
      skin: "Determined by avatar reference images.",
      pose: "Inferred from the target TikTok frame.",
    },
    camera: {
      device: "iPhone front-facing camera, casual handheld or propped selfie camera.",
      angle: "Inferred from the target TikTok frame.",
      position: "Inferred from the target TikTok frame.",
      distance: "Inferred from the target TikTok frame.",
      focus: "Slightly soft phone front-camera focus, not a polished studio image.",
      framing:
        "Natural selfie framing, with a motion-control-friendly head, shoulders, and upper chest when possible.",
      hand_visibility: "Inferred from the target TikTok frame; do not invent extra hands.",
      selfie_constraint:
        "The phone is the camera and should not be visible. Keep the setup physically plausible.",
      quality: "Casual iPhone front-camera quality with natural room or car lighting.",
    },
    scene: {
      environment: "Inferred directly from the supplied target TikTok frame.",
      depth: "Inferred directly from the supplied target TikTok frame.",
      objects: "Inferred directly from the supplied target TikTok frame.",
      atmosphere: "Casual, unstaged UGC selfie feel.",
    },
    lighting: {
      source: "Inferred from the supplied target TikTok frame.",
      quality: "Natural ambient light, not studio lighting.",
      shadows: "Match the target TikTok frame naturally.",
      highlights: "Match the target TikTok frame naturally.",
    },
    clothing: {
      outfit: wardrobeInstruction,
      style:
        "Fresh, trendy, cute Gen Z casual styling that looks attractive and natural in a TikTok UGC selfie, not editorial fashion.",
      accessories:
        "Minimal avatar-appropriate accessories only; avoid copying any source-subject jewelry, glasses, hats, bags, or standout accessories.",
    },
    tiktok_aesthetic: {
      vibe: "Casual UGC creator in a real everyday environment.",
      color_grading:
        "Natural phone camera color, no heavy grading, muted everyday colors.",
      texture:
        "Normal phone-camera texture, slightly soft and unpolished without looking low quality.",
      imperfections:
        "Natural selfie imperfections and ambient-light variation, no beauty retouching.",
      feel: "A real iPhone front-camera frame from someone's camera roll.",
    },
    compositing: {
      instruction: [
        "Place the avatar person naturally into the scene shown by the final TikTok reference image.",
        "Use the avatar reference images for identity: face, facial structure, hair, skin tone, complexion, and body type.",
        "Use the final TikTok frame for scene, lighting, casual selfie perspective, hand visibility, and pose.",
        userPrompt?.trim() ? `Additional instructions: ${userPrompt.trim()}` : "",
      ]
        .filter(Boolean)
        .join(" "),
      lighting_match: "Match the target TikTok frame's ambient lighting.",
      perspective:
        "Let the target TikTok frame determine the natural selfie perspective, but avoid an unstable extreme close-up when shoulders are needed for motion control.",
      integration:
        "The avatar should look like they belong in the room or car shown by the target TikTok frame.",
    },
    text_overlays: {
      detected: "Not analyzed separately.",
      instruction:
        "Ignore and do not reproduce text overlays, captions, watermarks, hashtags, usernames, or TikTok UI.",
    },
    style:
      "Unedited iPhone front-camera selfie. Natural ambient lighting, casual UGC realism, no studio look.",
    negative: DEFAULT_NEGATIVE_PROMPT,
  };
}

export async function analyzeSceneAndBuildPrompt(
  _frameImagePath: string,
  userPrompt?: string,
  options?: { poseEmphasis?: boolean }
): Promise<{
  promptJson: ScenePromptJSON;
  promptString: string;
  negativePrompt: string;
}> {
  const wardrobeInstruction = pickWardrobeInstruction();
  const promptJson = buildPromptJson(userPrompt, wardrobeInstruction);
  const promptString = buildNaturalLanguagePrompt(
    promptJson,
    options?.poseEmphasis,
    userPrompt,
    wardrobeInstruction
  );

  return {
    promptJson,
    promptString,
    negativePrompt: promptJson.negative,
  };
}

function buildNaturalLanguagePrompt(
  json: ScenePromptJSON,
  poseEmphasis?: boolean,
  userPrompt?: string,
  wardrobeInstruction = AVATAR_WARDROBE_INSTRUCTION
): string {
  const imgNum = Math.floor(Math.random() * 9000) + 1000;
  const poseInstruction = poseEmphasis
    ? "Use the target TikTok frame's body language and expression as the starting pose. Keep the pose useful for motion control, but do not force an awkward crop or camera angle."
    : "";

  const userInstruction = userPrompt?.trim()
    ? `User direction: ${userPrompt.trim()}`
    : "";

  const parts = [
    `IMG_${imgNum}.HEIC`,
    "All reference images except the final one are the same avatar person.",
    "Use the avatar references for the person's identity: face, facial structure, eye shape, eyebrow shape, hair color, hair style, hair length, hair texture, skin tone, complexion, and body type.",
    "This is a full person replacement, not a face swap.",
    "The final reference image is the target TikTok frame. Let the image model inspect that frame directly for background, lighting, casual selfie perspective, crop, hand visibility, environment, pose, and expression.",
    "Do not copy the TikTok subject's face, hair, skin tone, or body identity.",
    "Do not reproduce text overlays, captions, watermarks, usernames, or TikTok UI.",
    "Keep a casual iPhone front-camera selfie feel. The phone is the camera and should not be visible.",
    "Prefer a motion-control-friendly medium close-up when the source is very tight: face, neck, shoulders, and upper chest visible when possible, without turning it into a professional portrait.",
    "Let the target TikTok frame determine the natural camera angle and crop. Avoid rigidly copying extreme close-up geometry if it hurts the body/shoulder structure needed for motion control.",
    "Use natural ambient lighting and everyday phone-camera texture. No ring light, studio lighting, professional portrait lighting, fashion/editorial styling, or beauty retouching.",
    wardrobeInstruction,
    "The avatar outfit must be clearly different from the TikTok source outfit even if the pose, framing, room, and lighting are similar.",
    "Do not add glasses, sunglasses, headphones, earbuds, headsets, hats, caps, beanies, face masks, or wearable tech unless the user explicitly asks for them.",
    "Do not add extra hands, extra limbs, or a visible phone.",
    json.compositing.lighting_match,
    json.compositing.integration,
    poseInstruction,
    userInstruction,
  ];

  return parts.filter(Boolean).join(". ").replace(/\.\./g, ".").replace(/\s+/g, " ").trim();
}
