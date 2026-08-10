export type CharacterAttributes = Record<string, string>;

export type CharacterAttributeGroup = {
  key: string;
  label: string;
  options: readonly string[];
};

export type CharacterAttributeSection = {
  id: string;
  label: string;
  groups: readonly CharacterAttributeGroup[];
};

const HAIR_STYLES = [
  "Buzz Cut", "Crew Cut", "Ivy League", "Caesar Cut", "Low Fade", "Mid Fade",
  "High Fade", "Taper Fade", "Skin Fade", "Drop Fade", "Burst Fade", "Temple Fade",
  "Shadow Fade", "Low Taper", "Low Taper Fade", "Mid Taper", "Blowout Taper",
  "Textured Crop", "French Crop", "Edgar Cut", "Undercut", "Disconnected Undercut",
  "Side Part", "Hard Part", "Comb Over", "Comb Over Fade", "Slicked Back",
  "Slicked Back Undercut", "Slicked Back Fade", "Pompadour", "Modern Pompadour",
  "Textured Pompadour", "Quiff", "Textured Quiff", "Messy Quiff", "Fringe",
  "Textured Fringe", "Angular Fringe", "Curtain Bangs", "Middle Part Curtains",
  "Middle Part Flow", "Mullet", "Modern Mullet", "Wolf Cut", "Shag", "Messy Textured",
  "Bed Head", "Spiky", "Faux Hawk", "Mohawk", "Flat Top", "High Top Fade", "Afro",
  "Short Afro", "Afro Fade", "Afro Taper", "Twists", "Short Twists", "Two Strand Twists",
  "Twist Out", "Locs", "Short Locs", "Freeform Locs", "Barrel Locs", "Starter Locs",
  "Loc Fade", "Cornrows", "Feed-In Cornrows", "Zigzag Cornrows", "Braids", "Box Braids",
  "Two Braids", "Tribal Braids", "Knotless Braids", "Man Bun", "Low Bun", "Samurai Bun",
  "Top Knot", "Shoulder Length", "Long Flowing", "Wavy Shoulder Length", "Wavy", "Curly",
  "Permed", "Fluffy Perm", "Tight Curls", "Blowout", "Brush Up", "Push Back",
  "Korean Two Block", "Korean Comma Hair", "K-Pop Layered", "Shaved", "Bald", "Bald Fade",
] as const;

export const CHARACTER_ATTRIBUTE_SECTIONS: readonly CharacterAttributeSection[] = [
  {
    id: "identity",
    label: "Identity",
    groups: [
      { key: "gender", label: "Gender", options: ["Female", "Male", "Non-binary"] },
      { key: "age", label: "Age", options: ["18-24", "25-30", "31-40", "41-50", "51-60", "60+"] },
    ],
  },
  {
    id: "ethnicity",
    label: "Ethnicity",
    groups: [{
      key: "ethnicity",
      label: "Ethnicity",
      options: [
        "Caucasian", "African American", "Black African", "East Asian", "Southeast Asian",
        "South Asian", "Middle Eastern", "Latino", "Latina", "Hispanic", "Pacific Islander",
        "Native American", "Mediterranean", "Scandinavian", "Eastern European", "West African",
        "East African", "Caribbean", "Filipino", "Korean", "Japanese", "Chinese", "Vietnamese",
        "Thai", "Indian", "Pakistani", "Bangladeshi", "Arab", "Persian", "Turkish", "Kurdish",
        "Brazilian", "Mexican", "Colombian", "Puerto Rican", "Dominican", "Haitian", "Jamaican",
        "Ethiopian", "Somali", "Nigerian", "Kenyan", "South African", "Maori", "Samoan", "Hawaiian",
      ],
    }],
  },
  {
    id: "skin",
    label: "Skin Details",
    groups: [
      { key: "skinClarity", label: "Clarity", options: ["Clear", "Mild Blemishes", "Acne", "Acne Scarring", "Rosacea", "Textured", "Rough", "Dewy", "Matte"] },
      { key: "freckles", label: "Freckles", options: ["None", "Light Subtle", "Moderate", "Heavy Dense", "Sun-kissed", "Across Nose Only"] },
      { key: "moles", label: "Moles", options: ["None", "One Beauty Mark", "Few Scattered", "Several Prominent", "Cheek Mole", "Lip Mole"] },
      { key: "underEyes", label: "Under-Eyes", options: ["Bright", "Slight Circles", "Dark Circles", "Puffy", "Tired", "Natural Shadows"] },
    ],
  },
  {
    id: "face-shape",
    label: "Face Shape",
    groups: [{ key: "faceShape", label: "Shape", options: ["Oval", "Round", "Square", "Soft Square", "Rectangular", "Oblong", "Heart", "Diamond", "Triangle", "Inverted Triangle", "Pear", "Trapezoid", "Long", "Wide", "Narrow", "Angular"] }],
  },
  {
    id: "face-details",
    label: "Face Details",
    groups: [
      { key: "jawline", label: "Jawline", options: ["Soft", "Defined", "Sharp", "Square", "Rounded", "Angular", "Wide", "Narrow", "Average"] },
      { key: "cheekbones", label: "Cheekbones", options: ["Subtle", "Flat", "Prominent", "High", "Low", "Wide", "Hollow"] },
      { key: "chin", label: "Chin", options: ["Rounded", "Pointed", "Square", "Cleft", "Receding", "Prominent", "Double", "Small"] },
      { key: "dimples", label: "Dimples", options: ["None", "Cheek Dimples", "One Cheek", "Chin Dimple", "Subtle Dimples"] },
      { key: "lips", label: "Lips", options: ["Full", "Thin", "Bow-shaped", "Wide", "Heart-shaped", "Asymmetric", "Pouty", "Downturned", "Average"] },
      { key: "lipFullness", label: "Lip Fullness", options: ["72", "50", "25", "100", "0"] },
    ],
  },
  {
    id: "hair",
    label: "Hair",
    groups: [
      { key: "hairColor", label: "Color", options: ["Black", "Dark Brown", "Brunette", "Auburn", "Chestnut", "Caramel", "Dirty Blonde", "Blonde", "Platinum", "Gray", "White", "Red"] },
      { key: "hairStyle", label: "Style", options: HAIR_STYLES },
      { key: "hairHighlights", label: "Highlights", options: ["None", "Subtle Highlights", "Balayage", "Ombre", "Chunky Highlights", "Face-framing Highlights", "Platinum Tips", "Streaks", "Sun-bleached"] },
    ],
  },
  {
    id: "eyes",
    label: "Eyes & Brows",
    groups: [
      { key: "eyeShape", label: "Eye Shape", options: ["Almond", "Round", "Hooded", "Monolid", "Upturned", "Downturned", "Wide-set", "Close-set", "Deep-set"] },
      { key: "eyeColor", label: "Eye Color", options: ["Brown", "Dark Brown", "Hazel", "Amber", "Green", "Blue", "Gray", "Black"] },
      { key: "eyebrows", label: "Eyebrows", options: ["Natural Arch", "Straight", "High Arch", "Soft Arch", "Bushy", "Thin", "Feathered", "Rounded", "Angular"] },
    ],
  },
  {
    id: "nose-ears",
    label: "Nose & Ears",
    groups: [
      { key: "noseShape", label: "Nose Shape", options: ["Straight", "Button", "Snub", "Aquiline", "Broad", "Narrow", "Turned-up", "Roman", "Bulbous"] },
      { key: "noseHeight", label: "Nose Height", options: ["Low", "Medium-Low", "Balanced", "Medium-High", "High"] },
      { key: "ears", label: "Ears", options: ["Average", "Small", "Large", "Protruding", "Flat", "Pointed", "Rounded", "Attached Lobe", "Free Lobe"] },
    ],
  },
  {
    id: "body",
    label: "Body",
    groups: [
      { key: "build", label: "Build", options: ["Athletic", "Fit", "Curvy", "Hourglass", "Slim", "Muscular", "Petite", "Average", "Plus-size", "Obese", "Dad-bod", "Skinny", "Stocky", "Lean", "Thick"] },
      { key: "height", label: "Height", options: ["Very Short", "Short", "Average", "Tall", "Very Tall"] },
      { key: "shoulders", label: "Shoulders", options: ["Narrow", "Average", "Broad", "Wide", "Sloped"] },
    ],
  },
  {
    id: "style",
    label: "Style & Accessories",
    groups: [
      { key: "aesthetic", label: "Aesthetic", options: ["Casual Minimal", "Streetwear", "Preppy", "Goth", "Sophisticated", "Bohemian", "Sporty", "Vintage", "Edgy", "Glam", "Cottagecore", "Dark Academia"] },
      { key: "glasses", label: "Glasses", options: ["None", "Prescription Round", "Prescription Square", "Prescription Cat-eye", "Aviator Sunglasses", "Wayfarer Sunglasses", "Round Sunglasses", "Oversized Sunglasses", "Reading Glasses"] },
      { key: "jewelry", label: "Jewelry", options: ["None", "Minimal Gold", "Minimal Silver", "Layered Necklaces", "Statement Earrings", "Chunky Rings", "Delicate Chain", "Pearl", "Mixed Metals"] },
      { key: "headwear", label: "Headwear", options: ["None", "Baseball Cap", "Beanie", "Headband", "Headscarf", "Bucket Hat", "Wide Brim Hat", "Bandana"] },
      { key: "piercings", label: "Piercings", options: ["None", "Ear Studs", "Multiple Ear", "Nose Stud", "Septum", "Lip", "Eyebrow", "Belly Button", "Multiple Mixed"] },
    ],
  },
  {
    id: "marks",
    label: "Marks & Features",
    groups: [
      { key: "tattoos", label: "Tattoos", options: ["None", "Subtle Small", "Sleeve One Arm", "Full Sleeves", "Neck Tattoo", "Hand Tattoo", "Back Tattoo", "Chest Tattoo", "Heavily Tattooed"] },
      { key: "beard", label: "Beard", options: ["None", "Stubble", "Short Beard", "Full Beard", "Goatee", "Mustache", "Van Dyke", "Chinstrap", "Long Beard"] },
      { key: "scars", label: "Scars", options: ["None", "Small Facial Scar", "Eyebrow Scar", "Lip Scar", "Cheek Scar", "Forehead Scar", "Neck Scar", "Multiple Facial Scars"] },
      { key: "birthmarks", label: "Birthmarks", options: ["None", "Small Face Birthmark", "Large Face Birthmark", "Neck Birthmark", "Arm Birthmark", "Port Wine Stain"] },
      { key: "teeth", label: "Teeth", options: ["None", "Gap Front Teeth", "Crooked", "Slightly Crooked", "Gold Tooth", "Braces", "Perfect Straight"] },
    ],
  },
] as const;

export const DEFAULT_CHARACTER_ATTRIBUTES: CharacterAttributes = {
  ...Object.fromEntries(
    CHARACTER_ATTRIBUTE_SECTIONS.flatMap((section) =>
      section.groups.map((group) => [group.key, group.options[0]])
    )
  ),
  gender: "Female",
  age: "25-30",
  ethnicity: "Mediterranean",
  skinClarity: "Clear",
  freckles: "None",
  moles: "None",
  underEyes: "Bright",
  faceShape: "Oval",
  jawline: "Defined",
  cheekbones: "High",
  chin: "Rounded",
  dimples: "None",
  lips: "Full",
  lipFullness: "72",
  hairColor: "Black",
  hairStyle: "Low Bun",
  hairHighlights: "None",
  eyeShape: "Almond",
  eyeColor: "Brown",
  eyebrows: "Natural Arch",
  noseShape: "Straight",
  noseHeight: "Balanced",
  ears: "Average",
  build: "Slim",
  height: "Average",
  shoulders: "Average",
  aesthetic: "Casual Minimal",
  glasses: "None",
  jewelry: "None",
  headwear: "None",
  piercings: "None",
  tattoos: "None",
  beard: "None",
  scars: "None",
  birthmarks: "None",
  teeth: "None",
};

const OPTIONAL_CHARACTER_TRAITS = new Set([
  "freckles",
  "moles",
  "dimples",
  "hairHighlights",
  "glasses",
  "jewelry",
  "headwear",
  "piercings",
  "tattoos",
  "beard",
  "scars",
  "birthmarks",
  "teeth",
]);

function randomCharacterOption(group: CharacterAttributeGroup) {
  const noneIndex = group.options.indexOf("None");
  if (
    OPTIONAL_CHARACTER_TRAITS.has(group.key) &&
    noneIndex >= 0 &&
    Math.random() < 0.55
  ) {
    return group.options[noneIndex];
  }

  const candidates =
    OPTIONAL_CHARACTER_TRAITS.has(group.key) && noneIndex >= 0
      ? group.options.filter((_, index) => index !== noneIndex)
      : group.options;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function randomCharacterAttributes(): CharacterAttributes {
  return Object.fromEntries(
    CHARACTER_ATTRIBUTE_SECTIONS.flatMap((section) =>
      section.groups.map((group) => [group.key, randomCharacterOption(group)])
    )
  );
}

export function buildCharacterPrompt(attributes: CharacterAttributes) {
  return CHARACTER_ATTRIBUTE_SECTIONS.flatMap((section) => section.groups)
    .map((group) => `${group.label}: ${attributes[group.key] ?? group.options[0]}`)
    .join(", ");
}

export function characterRecipeFingerprint(attributes: CharacterAttributes) {
  const recipe = CHARACTER_ATTRIBUTE_SECTIONS.flatMap((section) => section.groups)
    .map((group) => `${group.key}=${attributes[group.key] ?? group.options[0]}`)
    .join("|");
  let hash = 2166136261;
  for (let index = 0; index < recipe.length; index += 1) {
    hash ^= recipe.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `character-recipe-v1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function buildCharacterImagePrompt(attributes: CharacterAttributes) {
  const value = (key: string) => attributes[key] ?? "unspecified";
  const attributeRecipe = Object.fromEntries(
    CHARACTER_ATTRIBUTE_SECTIONS.map((section) => [
      section.id,
      Object.fromEntries(
        section.groups.map((group) => [
          group.key,
          attributes[group.key] ?? group.options[0],
        ])
      ),
    ])
  );

  const prompt = {
    schema: "postforge.character-image.v2",
    objective: {
      task: "Generate exactly one photograph of a fictional adult human.",
      intended_use:
        "Reusable identity anchor for vertical short-form UGC, TikTok-style ads, product testimonials, and creator-led social videos.",
      realism_target:
        "The result must be immediately believable as a camera photo of a real person, not a designed character or rendered asset.",
    },
    character: {
      identity_anchors: {
        gender_presentation: value("gender"),
        apparent_age: value("age"),
        ethnicity: value("ethnicity"),
        skin: value("skinClarity"),
        face_shape: value("faceShape"),
        jawline: value("jawline"),
        cheekbones: value("cheekbones"),
        chin: value("chin"),
        lips: value("lips"),
        lip_fullness_percent: value("lipFullness"),
        hair_color: value("hairColor"),
        hair_style: value("hairStyle"),
        hair_highlights: value("hairHighlights"),
        eye_shape: value("eyeShape"),
        eye_color: value("eyeColor"),
        eyebrows: value("eyebrows"),
        nose_shape: value("noseShape"),
        nose_height: value("noseHeight"),
      },
      visible_details: {
        freckles: value("freckles"),
        moles: value("moles"),
        under_eyes: value("underEyes"),
        dimples: value("dimples"),
        ears: value("ears"),
        glasses: value("glasses"),
        jewelry: value("jewelry"),
        headwear: value("headwear"),
        piercings: value("piercings"),
        beard: value("beard"),
        facial_scars: value("scars"),
        birthmarks: value("birthmarks"),
        distinctive_teeth: value("teeth"),
      },
      supporting_cues: {
        build: value("build"),
        height: value("height"),
        shoulders: value("shoulders"),
        aesthetic: value("aesthetic"),
        tattoos: value("tattoos"),
      },
      attribute_recipe: attributeRecipe,
    },
    photographic_direction: {
      composition:
        "3:4 vertical head-and-upper-torso creator casting photo, one person only, full head visible, eye-level framing, centered eye contact, calm natural expression.",
      capture:
        "Modern smartphone main-camera photograph with natural perspective, modest depth of field, slight sensor grain, ordinary camera-roll sharpness, and no artificial portrait-mode cutout.",
      lighting:
        "Soft daylight from a nearby window with gentle natural falloff, believable catchlights, mild real-world shadow variation, and no colored rim light.",
      setting:
        "Simple real interior in front of a lightly textured warm neutral wall, clean enough for identity reference use but not a studio set or virtual backdrop.",
      wardrobe:
        "Plausible everyday creator clothing guided by the selected aesthetic; use a simple crew-neck top when no stronger styling cue is visible.",
      color:
        "Natural smartphone white balance, moderate dynamic range, restrained contrast, realistic saturation, and no cinematic color grade.",
    },
    human_realism: [
      "Preserve natural skin pores, fine facial hair, tiny blemishes, subtle under-eye texture, and believable variation in skin tone.",
      "Keep mild facial asymmetry, individually resolved hair strands, physically plausible anatomy, and natural fabric texture.",
      "Use real optical and sensor behavior: slightly imperfect focus, restrained detail, soft highlight rolloff, and faint image noise.",
      "The person should feel approachable and camera-ready for a creator ad without looking beauty-filtered, airbrushed, synthetic, or impossibly perfect.",
    ],
    attribute_rules: [
      "Match every identity anchor exactly without averaging, substituting, or adding conflicting visible traits.",
      "Show visible details exactly when the framing can honestly reveal them.",
      "A value of None means omit that optional feature; it never means missing normal human anatomy.",
      "Use body, height, tattoos, and accessories only as supporting cues where this crop can show them naturally.",
    ],
    exclusions: [
      "video game character",
      "CGI",
      "3D render",
      "digital human",
      "illustration",
      "anime",
      "concept art",
      "plastic or waxy skin",
      "beauty-filter smoothing",
      "uncanny symmetry",
      "over-sharpened pores",
      "HDR glow",
      "cinematic colored rim light",
      "premium studio polish",
      "virtual background",
      "text",
      "captions",
      "interface chrome",
      "logo",
      "watermark",
      "collage",
      "extra people",
      "duplicate face",
      "cropped head",
    ],
  };

  return JSON.stringify(prompt, null, 2);
}
