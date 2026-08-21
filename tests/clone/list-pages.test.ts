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

const sourcesRoute = readFileSync(
  new URL("../../src/app/api/ugc-clone/sources/route.ts", import.meta.url),
  "utf8"
);
const referencesRoute = readFileSync(
  new URL("../../src/app/api/ugc-clone/references/route.ts", import.meta.url),
  "utf8"
);
const tiktokInput = readFileSync(
  new URL("../../src/components/tiktok-input.tsx", import.meta.url),
  "utf8"
);
const cloneForm = readFileSync(
  new URL("../../src/components/ugc-clone-form.tsx", import.meta.url),
  "utf8"
);

assert.match(sourcesRoute, /take,/);
assert.match(sourcesRoute, /nextCursor/);
assert.match(sourcesRoute, /DEFAULT_LIST_TAKE = 50/);
assert.match(sourcesRoute, /MAX_LIST_TAKE = 100/);
assert.match(sourcesRoute, /sources\.length === take/);
assert.doesNotMatch(sourcesRoute, /while \(.*take/);
assert.match(referencesRoute, /take,/);
assert.match(referencesRoute, /items: references\.map\(\(reference\) => \(\{/);
assert.match(referencesRoute, /nextCursor/);
assert.match(tiktokInput, /apiGet<SourceListPage>\("\/api\/ugc-clone\/sources"\)/);
assert.match(
  tiktokInput,
  /\/api\/ugc-clone\/sources\?cursor=\$\{encodeURIComponent\(sourcesNextCursor\)\}/
);
assert.match(tiktokInput, /Load more/);
assert.doesNotMatch(tiktokInput, /apiGet<SavedSource\[\]>/);
assert.match(
  cloneForm,
  /\/api\/ugc-clone\/references\?avatarId=\$\{encodeURIComponent\(nextAvatarId\)\}/
);
assert.match(
  cloneForm,
  /\/api\/ugc-clone\/references\?avatarId=\$\{encodeURIComponent\(avatarId\)\}&cursor=\$\{encodeURIComponent\(savedReferencesNextCursor\)\}/
);
assert.match(cloneForm, /Load more/);
assert.doesNotMatch(cloneForm, /savedReferences\.slice\(/);
assert.doesNotMatch(cloneForm, /REFERENCE_LIBRARY_PAGE_SIZE/);
assert.doesNotMatch(cloneForm, /apiGet<SavedReference\[\]>/);

type ListPage = { items: Array<{ id: string }>; nextCursor: string | null };

async function readPage(response: Response): Promise<ListPage> {
  const body = (await response.json()) as ListPage;
  assert.equal(Array.isArray(body), false);
  assert.ok(Array.isArray(body.items));
  assert.ok(body.nextCursor === null || typeof body.nextCursor === "string");
  return body;
}

(async () => {
  const { prisma } = await import("../../src/lib/db");
  const { GET: getSources } = await import(
    "../../src/app/api/ugc-clone/sources/route"
  );
  const { GET: getReferences } = await import(
    "../../src/app/api/ugc-clone/references/route"
  );

  const prefix = `pf-d-lists-${randomUUID()}`;
  const sourceIds: string[] = [];
  const assetKeys: string[] = [];
  let avatarId = "";
  const referenceIds: string[] = [];

  try {
    const newest = await prisma.tikTokSource.create({
      data: {
        label: `${prefix}-newest`,
        originalUrl: `https://tiktok.test/${prefix}/newest`,
        localPath: `tiktok-sources/${prefix}-newest.mp4`,
        filename: `${prefix}-newest.mp4`,
        durationSec: 4,
        width: 1080,
        height: 1920,
        createdAt: new Date("2099-12-31T00:00:03.000Z"),
      },
    });
    const missing = await prisma.tikTokSource.create({
      data: {
        label: `${prefix}-missing`,
        originalUrl: `https://tiktok.test/${prefix}/missing`,
        localPath: `tiktok-sources/${prefix}-missing.mp4`,
        filename: `${prefix}-missing.mp4`,
        durationSec: 4,
        width: 1080,
        height: 1920,
        createdAt: new Date("2099-12-31T00:00:02.000Z"),
      },
    });
    const oldest = await prisma.tikTokSource.create({
      data: {
        label: `${prefix}-oldest`,
        originalUrl: `https://tiktok.test/${prefix}/oldest`,
        localPath: `tiktok-sources/${prefix}-oldest.mp4`,
        filename: `${prefix}-oldest.mp4`,
        durationSec: 4,
        width: 1080,
        height: 1920,
        createdAt: new Date("2099-12-31T00:00:01.000Z"),
      },
    });
    sourceIds.push(newest.id, missing.id, oldest.id);

    await prisma.storedAsset.create({
      data: {
        key: newest.localPath,
        data: Buffer.from("newest-source"),
      },
    });
    await prisma.storedAsset.create({
      data: {
        key: oldest.localPath,
        data: Buffer.from("oldest-source"),
      },
    });
    assetKeys.push(newest.localPath, oldest.localPath);

    const firstPage = await readPage(
      await getSources(
        new NextRequest("http://localhost/api/ugc-clone/sources?limit=2")
      )
    );
    assert.equal(firstPage.items.length, 1);
    assert.equal(firstPage.items[0]?.id, newest.id);
    assert.equal(firstPage.nextCursor, missing.id);

    const secondPage = await readPage(
      await getSources(
        new NextRequest(
          `http://localhost/api/ugc-clone/sources?limit=2&cursor=${encodeURIComponent(missing.id)}`
        )
      )
    );
    assert.equal(secondPage.items[0]?.id, oldest.id);
    if (secondPage.items.length < 2) {
      assert.equal(secondPage.nextCursor, null);
    }

    const avatar = await prisma.avatar.create({
      data: {
        name: `${prefix}-avatar`,
        localPath: `avatars/${prefix}.png`,
        filename: `${prefix}.png`,
        mimeType: "image/png",
      },
    });
    avatarId = avatar.id;

    const refNewest = await prisma.ugcReferenceImage.create({
      data: {
        avatarId,
        prompt: `${prefix}-newest`,
        sourceVideoPathSnapshot: `tiktok-sources/${prefix}-newest.mp4`,
        filename: `${prefix}-ref-newest.png`,
        mimeType: "image/png",
        createdAt: new Date("2099-12-31T00:00:03.000Z"),
      },
    });
    const refMid = await prisma.ugcReferenceImage.create({
      data: {
        avatarId,
        prompt: `${prefix}-mid`,
        sourceVideoPathSnapshot: `tiktok-sources/${prefix}-newest.mp4`,
        filename: `${prefix}-ref-mid.png`,
        mimeType: "image/png",
        createdAt: new Date("2099-12-31T00:00:02.000Z"),
      },
    });
    const refOldest = await prisma.ugcReferenceImage.create({
      data: {
        avatarId,
        prompt: `${prefix}-oldest`,
        sourceVideoPathSnapshot: `tiktok-sources/${prefix}-newest.mp4`,
        filename: `${prefix}-ref-oldest.png`,
        mimeType: "image/png",
        createdAt: new Date("2099-12-31T00:00:01.000Z"),
      },
    });
    referenceIds.push(refNewest.id, refMid.id, refOldest.id);

    const missingAvatar = await getReferences(
      new NextRequest("http://localhost/api/ugc-clone/references")
    );
    assert.equal(missingAvatar.status, 400);

    const refFirst = await readPage(
      await getReferences(
        new NextRequest(
          `http://localhost/api/ugc-clone/references?avatarId=${encodeURIComponent(avatarId)}&limit=2`
        )
      )
    );
    assert.deepEqual(
      refFirst.items.map((item) => item.id),
      [refNewest.id, refMid.id]
    );
    assert.equal(refFirst.nextCursor, refMid.id);

    const refSecond = await readPage(
      await getReferences(
        new NextRequest(
          `http://localhost/api/ugc-clone/references?avatarId=${encodeURIComponent(avatarId)}&limit=2&cursor=${encodeURIComponent(refMid.id)}`
        )
      )
    );
    assert.deepEqual(
      refSecond.items.map((item) => item.id),
      [refOldest.id]
    );
    assert.equal(refSecond.nextCursor, null);
  } finally {
    if (referenceIds.length > 0) {
      await prisma.ugcReferenceImage.deleteMany({
        where: { id: { in: referenceIds } },
      });
    }
    if (avatarId) {
      await prisma.avatar.deleteMany({ where: { id: avatarId } });
    }
    if (sourceIds.length > 0) {
      await prisma.tikTokSource.deleteMany({
        where: { id: { in: sourceIds } },
      });
    }
    if (assetKeys.length > 0) {
      await prisma.storedAsset.deleteMany({
        where: { key: { in: assetKeys } },
      });
    }
    await prisma.$disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
