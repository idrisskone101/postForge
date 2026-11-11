import { calculateEstimatedCost } from "@/lib/ai/models";
import {
  characterRecipeFingerprint,
  DEFAULT_CHARACTER_ATTRIBUTES,
  type CharacterAttributes,
} from "@/lib/character-attributes";
import type { CharacterRecord } from "@/lib/characters";
import type { DemoManifest } from "./manifest";
import { basename, before, demoId, type Age } from "./seed-utils";
import type { DemoSeedPart } from "./types";

export function avatarIdFor(person: string) {
  return demoId(`avatar:${person}`);
}

export function identityPackIdFor(person: string) {
  return demoId(`identity-pack:${person}`);
}

/**
 * The sample cast: four fictional creators. Each has an Avatar portrait, a
 * completed Identity pack, and a Character recipe that points at the Avatar.
 */
export function buildIdentitySeed(manifest: DemoManifest, now: Date): DemoSeedPart {
  const part: Required<
    Pick<DemoSeedPart, "avatars" | "identityPacks" | "identityImages" | "jobs" | "costLogs">
  > = { avatars: [], identityPacks: [], identityImages: [], jobs: [], costLogs: [] };
  const characters: CharacterRecord[] = [];

  for (const person of CAST) {
    const portrait = manifest.asset(`avatars/seed/${person.slug}.jpg`);
    const avatarId = avatarIdFor(person.slug);
    const createdAt = before(now, person.age);

    part.avatars.push({
      id: avatarId,
      name: person.name,
      localPath: portrait.path,
      filename: basename(portrait.path),
      mimeType: portrait.mimeType,
      width: portrait.width,
      height: portrait.height,
      fileSizeBytes: portrait.fileSizeBytes,
      origin: "generated",
      createdAt,
      updatedAt: createdAt,
    });

    const packImages = manifest
      .group("identity")
      .filter((asset) => asset.avatar === person.slug && asset.role);
    if (packImages.length > 0) {
      const packId = identityPackIdFor(person.slug);
      const packAt = new Date(createdAt.getTime() + 4 * 60_000);
      const cost =
        calculateEstimatedCost("nano-banana-2", { numImages: 1 }) * packImages.length;
      const jobId = demoId(`job:identity-pack:${person.slug}`);
      const prompt = `Identity image set for ${person.name}`;
      const roles = packImages.map((asset) => asset.role as string);

      part.identityPacks.push({
        id: packId,
        avatarId,
        status: "completed",
        imageModel: "nano-banana-2",
        createdAt: packAt,
        updatedAt: packAt,
      });
      part.identityImages.push(
        ...packImages.map((asset) => ({
          id: demoId(`identity-image:${asset.path}`),
          packId,
          role: asset.role as string,
          localPath: asset.path,
          filename: basename(asset.path),
          mimeType: asset.mimeType,
          width: asset.width,
          height: asset.height,
          fileSizeBytes: asset.fileSizeBytes,
          createdAt: packAt,
        }))
      );
      part.jobs.push({
        id: jobId,
        type: "image",
        model: "nano-banana-2",
        status: "completed",
        queueStage: "completed",
        prompt,
        input: { avatarId, identityPackId: packId, roles },
        output: { imageCount: packImages.length },
        attempts: 1,
        estimatedCost: cost,
        actualCost: cost,
        durationMs: 74_000,
        tags: ["avatar-identity", `avatar:${avatarId}`, `identity-pack:${packId}`],
        createdAt: new Date(packAt.getTime() - 76_000),
        startedAt: new Date(packAt.getTime() - 74_000),
        completedAt: packAt,
      });
      part.costLogs.push({
        id: demoId(`cost:identity-pack:${person.slug}`),
        jobId,
        model: "nano-banana-2",
        type: "image",
        amount: cost,
        details: { identityPackId: packId, avatarId, roles },
        createdAt: packAt,
      });
    }

    const attributes: CharacterAttributes = {
      ...DEFAULT_CHARACTER_ATTRIBUTES,
      ...person.attributes,
    };
    characters.push({
      id: demoId(`character:${person.slug}`),
      name: person.name,
      attributes,
      previewSeed: person.previewSeed,
      avatarId,
      previewKind: "photographic",
      previewFingerprint: characterRecipeFingerprint(attributes),
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });
  }

  return { ...part, features: { characters } };
}

type CastMember = {
  slug: string;
  name: string;
  age: Age;
  previewSeed: number;
  attributes: CharacterAttributes;
};

const CAST: CastMember[] = [
  {
    slug: "maya",
    name: "Maya",
    age: { days: 16, hours: 2 },
    previewSeed: 4127,
    attributes: {
      gender: "Female",
      age: "25-30",
      ethnicity: "Mediterranean",
      hairColor: "Dark Brown",
      hairStyle: "Curly",
      eyeColor: "Brown",
      build: "Average",
      aesthetic: "Casual Minimal",
    },
  },
  {
    slug: "priya",
    name: "Priya",
    age: { days: 16, hours: 1 },
    previewSeed: 7734,
    attributes: {
      gender: "Female",
      age: "25-30",
      ethnicity: "South Asian",
      hairColor: "Black",
      hairStyle: "Long Flowing",
      eyeColor: "Dark Brown",
      build: "Slim",
      aesthetic: "Bohemian",
    },
  },
  {
    slug: "jonah",
    name: "Jonah",
    age: { days: 15, hours: 5 },
    previewSeed: 2291,
    attributes: {
      gender: "Male",
      age: "31-40",
      ethnicity: "Caucasian",
      hairColor: "Dark Brown",
      hairStyle: "Textured Crop",
      eyeColor: "Hazel",
      build: "Fit",
      beard: "Short Beard",
      aesthetic: "Casual Minimal",
    },
  },
  {
    slug: "theo",
    name: "Theo",
    age: { days: 15, hours: 4 },
    previewSeed: 9052,
    attributes: {
      gender: "Male",
      age: "25-30",
      ethnicity: "Caucasian",
      hairColor: "Brunette",
      hairStyle: "Messy Textured",
      eyeColor: "Blue",
      build: "Lean",
      glasses: "Prescription Round",
      headwear: "Beanie",
      aesthetic: "Streetwear",
    },
  },
];
