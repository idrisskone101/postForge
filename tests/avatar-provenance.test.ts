import assert from "node:assert/strict";
import {
  buildAvatarCreateData,
  serializeAvatarApiRecord,
} from "../src/lib/avatar-provenance";

const importedAvatar = buildAvatarCreateData({
  name: "Imported Creator",
  localPath: "avatars/accepted.png",
  filename: "accepted.png",
  mimeType: "image/png",
  fileSizeBytes: 2048,
  origin: "imported",
  provenance: {
    avatarProfile: {
      handle: "@creator",
      traits: ["warm studio light", "direct address"],
    },
    seedReferenceImages: [
      {
        id: "seed-1",
        localPath: "avatar-imports/seed-1.png",
        filename: "seed-1.png",
        mimeType: "image/png",
      },
      {
        id: "seed-2",
        localPath: "avatar-imports/seed-2.png",
        filename: "seed-2.png",
        mimeType: "image/png",
      },
    ],
  },
});

assert.equal(importedAvatar.origin, "imported");
assert.equal(importedAvatar.localPath, "avatars/accepted.png");
assert.deepEqual(importedAvatar.provenance, {
  avatarProfile: {
    handle: "@creator",
    traits: ["warm studio light", "direct address"],
  },
  seedReferenceImages: [
    {
      id: "seed-1",
      localPath: "avatar-imports/seed-1.png",
      filename: "seed-1.png",
      mimeType: "image/png",
    },
    {
      id: "seed-2",
      localPath: "avatar-imports/seed-2.png",
      filename: "seed-2.png",
      mimeType: "image/png",
    },
  ],
});

assert.deepEqual(
  serializeAvatarApiRecord({
    id: "avatar-imported",
    name: "Imported Creator",
    localPath: "avatars/accepted.png",
    filename: "accepted.png",
    mimeType: "image/png",
    width: null,
    height: null,
    fileSizeBytes: 2048,
    origin: "imported",
    provenance: importedAvatar.provenance,
    createdAt: new Date("2026-06-14T12:00:00.000Z"),
    updatedAt: new Date("2026-06-14T12:05:00.000Z"),
  }),
  {
    id: "avatar-imported",
    name: "Imported Creator",
    localPath: "avatars/accepted.png",
    filename: "accepted.png",
    mimeType: "image/png",
    width: null,
    height: null,
    fileSizeBytes: 2048,
    origin: "imported",
    provenanceSummary: {
      hasAvatarProfile: true,
      seedReferenceImageCount: 2,
    },
    createdAt: new Date("2026-06-14T12:00:00.000Z"),
    updatedAt: new Date("2026-06-14T12:05:00.000Z"),
  }
);

assert.deepEqual(
  serializeAvatarApiRecord({
    id: "avatar-existing",
    name: "Existing Avatar",
    localPath: "avatars/existing.png",
    filename: "existing.png",
    mimeType: "image/png",
    width: 1024,
    height: 1024,
    fileSizeBytes: null,
    createdAt: new Date("2026-06-14T12:00:00.000Z"),
    updatedAt: new Date("2026-06-14T12:00:00.000Z"),
  }),
  {
    id: "avatar-existing",
    name: "Existing Avatar",
    localPath: "avatars/existing.png",
    filename: "existing.png",
    mimeType: "image/png",
    width: 1024,
    height: 1024,
    fileSizeBytes: null,
    origin: "uploaded",
    provenanceSummary: {
      hasAvatarProfile: false,
      seedReferenceImageCount: 0,
    },
    createdAt: new Date("2026-06-14T12:00:00.000Z"),
    updatedAt: new Date("2026-06-14T12:00:00.000Z"),
  }
);
