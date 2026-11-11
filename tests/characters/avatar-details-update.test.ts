import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { NextRequest } from "next/server";

config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env"),
});
process.env.DATABASE_URL ??=
  "postgresql://postforge:postforge@127.0.0.1:5432/postforge";

// Saving a character whose portrait has not changed must not replace the
// Avatar file: replacing it discards the Identity packs and saved references.
const characterPreview = readFileSync(
  new URL("../../src/app/(app)/characters/new/character-preview.ts", import.meta.url),
  "utf8"
);
const unchangedBranch = characterPreview.indexOf('method: "PATCH"');
const uploadBranch = characterPreview.indexOf('method: "PUT"');
assert.ok(unchangedBranch > 0, "an unchanged portrait updates details with PATCH");
assert.ok(uploadBranch > unchangedBranch, "the upload only runs after the PATCH branch");
assert.match(
  characterPreview,
  /previewSourceUrl === `\/api\/avatars\/\$\{encodeURIComponent\(currentAvatarId\)\}`/
);

function patchRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/avatars/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

(async () => {
  const { prisma } = await import("../../src/lib/db");
  const { PATCH } = await import("../../src/app/api/avatars/[id]/route");
  const tag = `pf-avatar-details-${randomUUID()}`;
  const avatar = await prisma.avatar.create({
    data: {
      name: `${tag}-before`,
      localPath: `avatars/2026-01-01/${tag}.jpg`,
      filename: `${tag}.jpg`,
      mimeType: "image/jpeg",
      origin: "generated",
    },
  });
  const params = { params: Promise.resolve({ id: avatar.id }) };

  try {
    const pack = await prisma.avatarIdentityPack.create({
      data: {
        avatarId: avatar.id,
        status: "completed",
        images: {
          create: {
            role: "front",
            localPath: `avatar-identity-packs/2026-01-01/${tag}-front.jpg`,
            filename: `${tag}-front.jpg`,
            mimeType: "image/jpeg",
          },
        },
      },
    });
    const reference = await prisma.ugcReferenceImage.create({
      data: {
        avatarId: avatar.id,
        sourceVideoPathSnapshot: `tiktok-sources/2026-01-01/${tag}.mp4`,
        prompt: "reference",
        localPath: `ugc-references/2026-01-01/${tag}.jpg`,
        filename: `${tag}.jpg`,
        mimeType: "image/jpeg",
      },
    });

    const renamed = await PATCH(
      patchRequest(avatar.id, {
        name: `  ${tag}-after  `,
        provenance: { avatarProfile: { characterId: "c1" }, seedReferenceImages: [] },
      }),
      params
    );
    assert.equal(renamed.status, 200);
    const body = (await renamed.json()) as { id: string; name: string };
    assert.equal(body.id, avatar.id);
    assert.equal(body.name, `${tag}-after`);

    const stored = await prisma.avatar.findUniqueOrThrow({ where: { id: avatar.id } });
    assert.equal(stored.name, `${tag}-after`);
    assert.equal(stored.localPath, avatar.localPath, "the portrait file is untouched");
    assert.deepEqual(stored.provenance, {
      avatarProfile: { characterId: "c1" },
      seedReferenceImages: [],
    });

    // Everything derived from the portrait survives a rename.
    assert.equal(await prisma.avatarIdentityPack.count({ where: { id: pack.id } }), 1);
    assert.equal(await prisma.avatarIdentityImage.count({ where: { packId: pack.id } }), 1);
    assert.equal(await prisma.ugcReferenceImage.count({ where: { id: reference.id } }), 1);

    // A provenance-only update leaves the name alone.
    const provenanceOnly = await PATCH(
      patchRequest(avatar.id, { provenance: { seedReferenceImages: [] } }),
      params
    );
    assert.equal(provenanceOnly.status, 200);
    assert.equal(
      (await prisma.avatar.findUniqueOrThrow({ where: { id: avatar.id } })).name,
      `${tag}-after`
    );

    for (const invalid of [{ name: "   " }, { name: 7 }, { provenance: "nope" }, [], "not json"]) {
      const rejected = await PATCH(patchRequest(avatar.id, invalid), params);
      assert.equal(rejected.status, 400, JSON.stringify(invalid));
    }

    const missingId = randomUUID();
    const missing = await PATCH(patchRequest(missingId, { name: "x" }), {
      params: Promise.resolve({ id: missingId }),
    });
    assert.equal(missing.status, 404);
  } finally {
    await prisma.avatar.delete({ where: { id: avatar.id } }).catch(() => undefined);
    await prisma.$disconnect();
  }
  console.log("avatar details update tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
