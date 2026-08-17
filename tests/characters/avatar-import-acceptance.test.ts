import assert from "node:assert/strict";
import { acceptAvatarCandidateAsImportedAvatar } from "../../src/lib/avatar-import-acceptance";

async function main() {
  const discardedCandidateIds: string[] = [];
  const startedIdentityPackIds: string[] = [];

  const result = await acceptAvatarCandidateAsImportedAvatar(
    {
      fileId: "candidate-accepted",
      candidateFileIds: ["candidate-rejected-a", "candidate-accepted", "candidate-rejected-b"],
      name: " Edited Creator ",
      rawAvatarProfileJson: JSON.stringify({
        handle: "@edited",
        traits: ["direct address", "warm studio light"],
      }),
      seedReferenceImages: [
        {
          name: "front.jpg",
          size: 1200,
          type: "image/jpeg",
        },
        {
          name: "side.jpg",
          size: 1300,
          type: "image/jpeg",
        },
      ],
    },
    {
      async findGeneratedImageFile(fileId) {
        assert.equal(fileId, "candidate-accepted");
        return {
          id: "candidate-accepted",
          localPath: "generated/candidate-accepted.png",
          filename: "candidate-accepted.png",
          mimeType: "image/png",
          width: 768,
          height: 1024,
          fileSizeBytes: 4096,
        };
      },
      async readStorage(localPath) {
        assert.equal(localPath, "generated/candidate-accepted.png");
        return Buffer.from("accepted-image");
      },
      async saveAvatarImage(filename, data) {
        assert.match(filename, /\.png$/);
        assert.deepEqual(data, Buffer.from("accepted-image"));
        return `avatars/${filename}`;
      },
      async createAvatar(data) {
        if (typeof data.localPath !== "string") {
          throw new Error("Imported avatar localPath must be persisted.");
        }
        return {
          id: "avatar-imported",
          name: data.name,
          localPath: data.localPath,
          filename: data.filename,
          mimeType: data.mimeType,
          width: data.width ?? null,
          height: data.height ?? null,
          fileSizeBytes: data.fileSizeBytes ?? null,
          origin: data.origin,
          provenance: data.provenance,
          createdAt: new Date("2026-06-14T20:00:00.000Z"),
          updatedAt: new Date("2026-06-14T20:00:00.000Z"),
        };
      },
      async discardGeneratedFiles(fileIds) {
        discardedCandidateIds.push(...fileIds);
      },
      async ensureIdentityPack(avatarId) {
        startedIdentityPackIds.push(avatarId);
        return { id: "pack-queued", status: "queued" };
      },
    }
  );

  assert.equal(result.avatar.id, "avatar-imported");
  assert.equal(result.avatar.name, "Edited Creator");
  assert.equal(result.avatar.origin, "imported");
  assert.equal(result.avatar.localPath.startsWith("avatars/"), true);
  assert.deepEqual(result.avatar.provenance, {
    avatarProfile: {
      handle: "@edited",
      traits: ["direct address", "warm studio light"],
    },
    seedReferenceImages: [
      {
        name: "front.jpg",
        size: 1200,
        type: "image/jpeg",
      },
      {
        name: "side.jpg",
        size: 1300,
        type: "image/jpeg",
      },
    ],
  });
  assert.deepEqual(discardedCandidateIds, ["candidate-rejected-a", "candidate-rejected-b"]);
  assert.deepEqual(startedIdentityPackIds, ["avatar-imported"]);
  assert.deepEqual(result.identityPack, { id: "pack-queued", status: "queued" });
}

main();
