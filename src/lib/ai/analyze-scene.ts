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
  "Dress the avatar in a visibly different outfit from the TikTok subject. Choose a trendy, attractive but approachable, age-appropriate Gen Z outfit a stylish 20-year-old woman would realistically wear today. Keep the person attractive but not intimidating. Prefer mildly revealing but tasteful tops that show a bit of neckline, collarbone, shoulders, or natural cleavage when the target pose allows it. Keep the outfit current, flattering, fresh, and everyday-cute without copying the source subject's clothing silhouette, colors, logos, distinctive patterns, jewelry, or accessories. Use more variety, not just basic shirts: crop tops, off-shoulder tops, halter tanks, asymmetrical one-shoulder tops, lace-trim camis, corset-inspired soft tops, fitted ribbed tanks, cute going-out tops, matching athleisure sets, denim, wide-leg pants, boxer-style shorts, or drawstring pants in different colors. Avoid defaulting to flannels, plain button-down shirts, generic T-shirts, hoodies, beige basics, or the same white tank unless the source scene specifically requires it.";
const IPHONE_SELFIE_TEXTURE_INSTRUCTION =
  "Make the image feel like an ordinary iPhone front-camera selfie frame, not an AI portrait: slightly soft selfie focus, mild phone compression, modest dynamic range, visible skin texture, natural pores, tiny skin imperfections, uneven ambient light, and normal camera-roll color. Avoid glossy skin, perfect hair, beauty-filter smoothness, tack-sharp details, HDR contrast, studio cleanliness, or influencer photo polish.";

const WARDROBE_VARIATIONS = [
  "A fitted ribbed crop top with high-rise or wide-leg denim, using a different color palette from the source such as cocoa, teal, cherry red, butter yellow, or soft pink.",
  "A clean off-shoulder top or one-shoulder fitted knit with straight-leg jeans, showing collarbone and a little neckline while staying tasteful and approachable.",
  "A halter tank or square-neck going-out top with relaxed denim or drawstring pants, using colors like sage, cobalt, espresso, rose, or sky blue instead of default white or beige.",
  "A lace-trim cami or corset-inspired soft top with loose cargos or boxer-style shorts, flattering the figure without looking explicit or editorial.",
  "A cute matching athleisure set with a built-in-bra tank or cropped top and wide-leg pants, styled like a real casual creator selfie rather than workout stock photography.",
  "A fitted baby tee or cropped cardigan worn open over a small tank, paired with denim, using a fresh color pairing like powder blue with cream, cherry red with denim, or lavender with gray.",
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
        "Fresh, trendy Gen Z casual styling that looks attractive but approachable, mildly revealing but tasteful, and natural in a TikTok UGC selfie, not intimidating and not editorial fashion.",
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
