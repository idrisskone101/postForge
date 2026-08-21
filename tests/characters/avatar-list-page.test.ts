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

const avatarsRoute = readFileSync(
  new URL("../../src/app/api/avatars/route.ts", import.meta.url),
  "utf8"
);
const avatarPicker = readFileSync(
  new URL("../../src/components/avatar-picker.tsx", import.meta.url),
  "utf8"
);

assert.match(avatarsRoute, /take,/);
assert.match(avatarsRoute, /DEFAULT_LIST_TAKE = 50/);
assert.match(avatarsRoute, /MAX_LIST_TAKE = 100/);
assert.match(avatarsRoute, /items: avatars\.map\(serializeAvatarApiRecord\)/);
assert.match(avatarsRoute, /nextCursor/);
assert.match(avatarsRoute, /avatars\.length === take/);
assert.match(avatarPicker, /apiGet<AvatarListPage>\("\/api\/avatars"\)/);
assert.match(
  avatarPicker,
  /\/api\/avatars\?cursor=\$\{encodeURIComponent\(avatarsNextCursor\)\}/
);
assert.match(avatarPicker, /Load more/);
assert.doesNotMatch(avatarPicker, /apiGet<Avatar\[\]>\("\/api\/avatars"\)/);

type ListPage = { items: Array<{ id: string }>; nextCursor: string | null };

(async () => {
  const { prisma } = await import("../../src/lib/db");
  const { GET } = await import("../../src/app/api/avatars/route.ts");
  const prefix = `pf-d-lists-avatar-${randomUUID()}`;
  const ids: string[] = [];

  try {
    const newest = await prisma.avatar.create({
      data: {
        name: `${prefix}-newest`,
        localPath: `avatars/${prefix}-newest.png`,
        filename: `${prefix}-newest.png`,
        mimeType: "image/png",
        createdAt: new Date("2099-12-31T00:00:03.000Z"),
      },
    });
    const mid = await prisma.avatar.create({
      data: {
        name: `${prefix}-mid`,
        localPath: `avatars/${prefix}-mid.png`,
        filename: `${prefix}-mid.png`,
        mimeType: "image/png",
        createdAt: new Date("2099-12-31T00:00:02.000Z"),
      },
    });
    const oldest = await prisma.avatar.create({
      data: {
        name: `${prefix}-oldest`,
        localPath: `avatars/${prefix}-oldest.png`,
        filename: `${prefix}-oldest.png`,
        mimeType: "image/png",
        createdAt: new Date("2099-12-31T00:00:01.000Z"),
      },
    });
    ids.push(newest.id, mid.id, oldest.id);

    const firstResponse = await GET(
      new NextRequest("http://localhost/api/avatars?limit=2")
    );
    const firstPage = (await firstResponse.json()) as ListPage;
    assert.equal(Array.isArray(firstPage), false);
    assert.deepEqual(
      firstPage.items.map((item) => item.id),
      [newest.id, mid.id]
    );
    assert.equal(firstPage.nextCursor, mid.id);

    const secondResponse = await GET(
      new NextRequest(
        `http://localhost/api/avatars?limit=2&cursor=${encodeURIComponent(mid.id)}`
      )
    );
    const secondPage = (await secondResponse.json()) as ListPage;
    assert.equal(secondPage.items[0]?.id, oldest.id);
    assert.ok(
      secondPage.nextCursor === null || typeof secondPage.nextCursor === "string"
    );
    if (secondPage.items.length < 2) {
      assert.equal(secondPage.nextCursor, null);
    }

    const uncapped = await GET(new NextRequest("http://localhost/api/avatars?limit=500"));
    const uncappedPage = (await uncapped.json()) as ListPage;
    assert.ok(uncappedPage.items.length <= 100);
  } finally {
    if (ids.length > 0) {
      await prisma.avatar.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
