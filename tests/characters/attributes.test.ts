import assert from "node:assert/strict";
import {
  buildCharacterPrompt,
  CHARACTER_ATTRIBUTE_SECTIONS,
  DEFAULT_CHARACTER_ATTRIBUTES,
  randomCharacterAttributes,
} from "../../src/lib/character-attributes";

const expectedSections = [
  {
    id: "identity",
    label: "Identity",
    groups: ["gender", "age"],
  },
  {
    id: "ethnicity",
    label: "Ethnicity",
    groups: ["ethnicity"],
  },
  {
    id: "skin",
    label: "Skin Details",
    groups: ["skinClarity", "freckles", "moles", "underEyes"],
  },
  {
    id: "face-shape",
    label: "Face Shape",
    groups: ["faceShape"],
  },
  {
    id: "face-details",
    label: "Face Details",
    groups: ["jawline", "cheekbones", "chin", "dimples", "lips", "lipFullness"],
  },
  {
    id: "hair",
    label: "Hair",
    groups: ["hairColor", "hairStyle", "hairHighlights"],
  },
  {
    id: "eyes",
    label: "Eyes & Brows",
    groups: ["eyeShape", "eyeColor", "eyebrows"],
  },
  {
    id: "nose-ears",
    label: "Nose & Ears",
    groups: ["noseShape", "noseHeight", "ears"],
  },
  {
    id: "body",
    label: "Body",
    groups: ["build", "height", "shoulders"],
  },
  {
    id: "style",
    label: "Style & Accessories",
    groups: ["aesthetic", "glasses", "jewelry", "headwear", "piercings"],
  },
  {
    id: "marks",
    label: "Marks & Features",
    groups: ["tattoos", "beard", "scars", "birthmarks", "teeth"],
  },
] as const;

assert.deepEqual(
  CHARACTER_ATTRIBUTE_SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    groups: section.groups.map((group) => group.key),
  })),
  expectedSections
);

assert.deepEqual(
  ["Overview", ...CHARACTER_ATTRIBUTE_SECTIONS.map((section) => section.label)],
  [
    "Overview",
    "Identity",
    "Ethnicity",
    "Skin Details",
    "Face Shape",
    "Face Details",
    "Hair",
    "Eyes & Brows",
    "Nose & Ears",
    "Body",
    "Style & Accessories",
    "Marks & Features",
  ]
);

const allGroups = CHARACTER_ATTRIBUTE_SECTIONS.flatMap(
  (section) => section.groups
);
const allKeys = allGroups.map((group) => group.key);

assert.equal(allGroups.length, 36);
assert.equal(new Set(allKeys).size, allKeys.length, "attribute keys must be unique");
assert.deepEqual(Object.keys(DEFAULT_CHARACTER_ATTRIBUTES), allKeys);

for (const group of allGroups) {
  assert.ok(group.options.length > 0, `${group.label} must expose options`);
  assert.equal(
    new Set(group.options).size,
    group.options.length,
    `${group.label} options must be unique`
  );
  assert.equal(
    group.options.includes(DEFAULT_CHARACTER_ATTRIBUTES[group.key]),
    true,
    `${group.label} must have a valid deterministic default`
  );
}

const groupByKey = new Map(allGroups.map((group) => [group.key, group]));
assert.deepEqual(groupByKey.get("gender")?.options, [
  "Female",
  "Male",
  "Non-binary",
]);
assert.deepEqual(groupByKey.get("skinClarity")?.options, [
  "Clear",
  "Mild Blemishes",
  "Acne",
  "Acne Scarring",
  "Rosacea",
  "Textured",
  "Rough",
  "Dewy",
  "Matte",
]);
assert.deepEqual(groupByKey.get("freckles")?.options, [
  "None",
  "Light Subtle",
  "Moderate",
  "Heavy Dense",
  "Sun-kissed",
  "Across Nose Only",
]);
assert.deepEqual(groupByKey.get("noseHeight")?.options, [
  "Low",
  "Medium-Low",
  "Balanced",
  "Medium-High",
  "High",
]);
assert.deepEqual(groupByKey.get("lipFullness")?.options, [
  "72",
  "50",
  "25",
  "100",
  "0",
]);
assert.ok(
  (groupByKey.get("hairStyle")?.options.length ?? 0) >= 90,
  "the detailed ReelFarm-inspired hair library must remain available"
);

const prompt = buildCharacterPrompt(DEFAULT_CHARACTER_ATTRIBUTES);
assert.equal(prompt.split(", ").length, allGroups.length);
assert.match(prompt, /Gender: Female/);
assert.match(prompt, /Clarity: Clear/);
assert.match(prompt, /Freckles: None/);
assert.match(prompt, /Shape: Oval/);
assert.match(prompt, /Nose Height: Balanced/);
assert.match(prompt, /Lip Fullness: 72/);
assert.match(prompt, /Teeth: None/);

const originalRandom = Math.random;
try {
  Math.random = () => 0.999999;
  const randomized = randomCharacterAttributes();
  assert.deepEqual(Object.keys(randomized), allKeys);
  for (const group of allGroups) {
    assert.equal(randomized[group.key], group.options[group.options.length - 1]);
  }
} finally {
  Math.random = originalRandom;
}

const optionalTraitKeys = [
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
];
try {
  Math.random = () => 0.1;
  const uncluttered = randomCharacterAttributes();
  for (const key of optionalTraitKeys) {
    assert.equal(
      uncluttered[key],
      "None",
      `${key} should support a weighted no-feature result`
    );
  }
} finally {
  Math.random = originalRandom;
}
