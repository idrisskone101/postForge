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
  "glossy skin",
  "perfect skin",
  "plastic skin",
  "poreless skin",
  "AI influencer",
  "commercial portrait",
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
const IPHONE_SELFIE_TEXTURE_INSTRUCTION =
  "Make the image feel like an ordinary iPhone front-camera selfie frame, not an AI portrait: slightly soft selfie focus, mild phone compression, modest dynamic range, natural pores, tiny skin imperfections, uneven ambient light, and normal camera-roll color. Avoid glossy skin, perfect hair, beauty-filter smoothness, tack-sharp details, HDR contrast, studio cleanliness, or influencer photo polish.";

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
        "Use the target TikTok frame as the strict visual source for pose, body position, gesture, expression, subject scale, and subject placement.",
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
        "Match the target TikTok frame's crop and subject placement. Keep any motion-control-friendly adjustment subtle enough that the person still starts in the same position and scale.",
      hand_visibility: "Inferred from the target TikTok frame; do not invent extra hands.",
      selfie_constraint:
        "The phone is the camera and should not be visible. Keep the setup physically plausible.",
      quality:
        "Casual iPhone front-camera quality with mild compression, modest sharpness, and natural room or car lighting.",
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
        "Normal phone-camera texture: slightly soft, mildly compressed, unpolished, and camera-roll-like without looking broken or low quality.",
      imperfections:
        "Natural selfie imperfections, visible but flattering skin texture, flyaway hair, and ambient-light variation. No beauty retouching.",
      feel: "A real iPhone front-camera frame from someone's camera roll.",
    },
    compositing: {
      instruction: [
        "Create a first-frame replacement for Kling motion control, not a new pose or alternate composition.",
        "Place the avatar person in the same body position, scale, crop, camera angle, and framing as the final TikTok reference image.",
        "Use the avatar reference images for identity: face, facial structure, hair, skin tone, complexion, and body type.",
        "Use the final TikTok frame for scene, lighting, casual selfie perspective, hand visibility, pose, and subject placement.",
        userPrompt?.trim() ? `Additional instructions: ${userPrompt.trim()}` : "",
      ]
        .filter(Boolean)
        .join(" "),
      lighting_match: "Match the target TikTok frame's ambient lighting.",
      perspective:
        "Let the target TikTok frame determine the natural selfie perspective, crop, camera distance, and camera height.",
      integration:
        "The avatar should look like they belong in the room or car shown by the target TikTok frame.",
    },
    text_overlays: {
      detected: "Not analyzed separately.",
      instruction:
        "Ignore and do not reproduce text overlays, captions, watermarks, hashtags, usernames, or TikTok UI.",
    },
    style:
      `Unedited iPhone front-camera selfie. Natural ambient lighting, casual UGC realism, no studio look. ${IPHONE_SELFIE_TEXTURE_INSTRUCTION}`,
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
    ? "This generated image will be the first frame for Kling motion control. Match the target TikTok frame's opening pose, body position, subject scale, crop, camera angle, camera height, and camera distance. Keep the avatar in the same starting position as the TikTok source while changing identity and outfit."
    : "";

  const userInstruction = userPrompt?.trim()
    ? `User direction: ${userPrompt.trim()}`
    : "";

  const parts = [
    `IMG_${imgNum}.HEIC`,
    "All reference images except the final one are the same avatar person.",
    "Use the avatar references for the person's identity: face, facial structure, eye shape, eyebrow shape, hair color, hair style, hair length, hair texture, skin tone, complexion, and body type.",
    "This is a full person replacement, not a face swap.",
    "The final reference image is the target TikTok frame. Treat it as the composition authority for background, lighting, casual selfie perspective, crop, hand visibility, environment, pose, expression, subject placement, and subject scale.",
    "Do not create a more flattering alternate pose, a different camera distance, or a new starting composition.",
    "Do not copy the TikTok subject's face, hair, skin tone, or body identity.",
    "Do not reproduce text overlays, captions, watermarks, usernames, or TikTok UI.",
    "Keep a casual iPhone front-camera selfie feel. The phone is the camera and should not be visible.",
    "Preserve the target TikTok frame's natural camera angle and crop. Any motion-control-friendly shoulder cleanup must keep the same subject placement and camera geometry.",
    IPHONE_SELFIE_TEXTURE_INSTRUCTION,
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
