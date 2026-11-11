import assert from "node:assert/strict";
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

type Call = { method: string; url: string; multipart: boolean };

/** Runs saveCharacterAvatar against a recorded fetch and returns what it sent. */
async function recordSave(
  input: { currentAvatarId: string | null; previewSourceUrl: string },
  respond: (call: Call) => Response
) {
  const { saveCharacterAvatar } = await import(
    "../../src/app/(app)/characters/new/character-preview"
  );
  const calls: Call[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    const call = {
      method: init?.method ?? "GET",
      url: String(url),
      multipart: init?.body instanceof FormData,
    };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
  try {
    const result = await saveCharacterAvatar({
      ...input,
      characterId: "character-1",
      name: "Maya",
      attributes: { gender: "Female" },
      previewSeed: 7,
      previewFingerprint: "fingerprint",
    }).then(
      (avatarId) => ({ avatarId, error: null as string | null }),
      (error: Error) => ({ avatarId: null, error: error.message })
    );
    return { calls, ...result };
  } finally {
    globalThis.fetch = realFetch;
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const image = () => new Response(new Blob(["x"], { type: "image/jpeg" }), { status: 200 });

async function runClientTests() {
  // Unchanged portrait: details only. Replacing the file would discard the
  // Identity packs and saved references made from it.
  const kept = await recordSave(
    { currentAvatarId: "avatar-1", previewSourceUrl: "/api/avatars/avatar-1" },
    () => json({ id: "avatar-1" })
  );
  assert.equal(kept.avatarId, "avatar-1");
  assert.deepEqual(kept.calls, [
    { method: "PATCH", url: "/api/avatars/avatar-1", multipart: false },
  ]);

  // A failed details update never falls back to replacing the file.
  for (const status of [404, 500]) {
    const failed = await recordSave(
      { currentAvatarId: "avatar-1", previewSourceUrl: "/api/avatars/avatar-1" },
      () => json({ error: "nope" }, status)
    );
    assert.equal(failed.avatarId, null);
    assert.ok(failed.error);
    assert.deepEqual(failed.calls.map((call) => call.method), ["PATCH"]);
  }

  // A newly rendered portrait replaces the linked Avatar's image.
  const replaced = await recordSave(
    { currentAvatarId: "avatar-1", previewSourceUrl: "/api/files/file-9" },
    (call) => (call.method === "GET" ? image() : json({ id: "avatar-1" }))
  );
  assert.equal(replaced.avatarId, "avatar-1");
  assert.deepEqual(replaced.calls, [
    { method: "GET", url: "/api/files/file-9", multipart: false },
    { method: "PUT", url: "/api/avatars/avatar-1", multipart: true },
  ]);

  // No Avatar yet: the portrait is uploaded as a new one.
  const created = await recordSave(
    { currentAvatarId: null, previewSourceUrl: "/api/files/file-9" },
    (call) => (call.method === "GET" ? image() : json({ id: "avatar-2" }))
  );
  assert.equal(created.avatarId, "avatar-2");
  assert.deepEqual(created.calls.map((call) => `${call.method} ${call.url}`), [
    "GET /api/files/file-9",
    "POST /api/avatars",
  ]);
}

function patchRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/avatars/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

(async () => {
  await runClientTests();
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

    for (const invalid of [
      { name: "   " },
      { name: 7 },
      { name: "a\u0000b" },
      { provenance: "nope" },
      { provenance: { avatarProfile: { note: "x".repeat(70_000) } } },
      // Size is measured in bytes, so multi-byte text cannot slip past the cap.
      { provenance: { avatarProfile: { note: "\u20ac".repeat(30_000) } } },
      [],
      "not json",
    ]) {
      const rejected = await PATCH(patchRequest(avatar.id, invalid), params);
      assert.equal(rejected.status, 400, JSON.stringify(invalid));
    }

    // The six characters backslash-u-0-0-0-0 typed out are ordinary text.
    const typedOut = await PATCH(patchRequest(avatar.id, { name: "a\\u0000b" }), params);
    assert.equal(typedOut.status, 200);

    // Only the name and provenance can change, whatever else is sent.
    const sneaky = await PATCH(
      patchRequest(avatar.id, {
        name: "Line\nbreak",
        localPath: "avatars/elsewhere.jpg",
        origin: "uploaded",
        mimeType: "text/html",
      }),
      params
    );
    assert.equal(sneaky.status, 200);
    const untouched = await prisma.avatar.findUniqueOrThrow({ where: { id: avatar.id } });
    assert.equal(untouched.name, "Line break");
    assert.equal(untouched.localPath, avatar.localPath);
    assert.equal(untouched.origin, "generated");
    assert.equal(untouched.mimeType, "image/jpeg");

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
