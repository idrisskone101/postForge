import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { DemoStorageDriver } from "../../src/lib/storage/demo";

type Overlay = ConstructorParameters<typeof DemoStorageDriver>[1];

async function runDemoStorageTests() {
  const seedBase = await fs.mkdtemp(path.join(os.tmpdir(), "postforge-demo-seed-"));
  const seedKey = "images/seed/sample.jpg";
  const seedFile = path.join(seedBase, seedKey);
  await fs.mkdir(path.dirname(seedFile), { recursive: true });
  await fs.writeFile(seedFile, "0123456789");

  // The overlay is the database driver in production; a recorder is enough to
  // prove which layer each call lands on.
  const calls: string[] = [];
  const overlay = {
    save: async (type: string, filename: string) => {
      calls.push(`save:${type}/${filename}`);
      return `${type}/2026-01-01/${filename}`;
    },
    saveFromFile: async () => "unused",
    read: async (key: string) => {
      calls.push(`read:${key}`);
      return Buffer.from("overlay");
    },
    readRange: async () => Buffer.from("ov"),
    size: async () => 7,
    delete: async (key: string) => {
      calls.push(`delete:${key}`);
    },
    exists: async (key: string) => key === "videos/2026-01-01/made-later.mp4",
    ensureLocalFile: async (key: string) => `/cache/${key}`,
  } as unknown as Overlay;

  try {
    const driver = new DemoStorageDriver(seedBase, overlay);

    // Sample media is served from disk without touching the overlay.
    assert.equal((await driver.read(seedKey)).toString(), "0123456789");
    assert.equal((await driver.readRange(seedKey, 2, 5)).toString(), "2345");
    assert.equal(await driver.size(seedKey), 10);
    assert.equal(await driver.exists(seedKey), true);
    assert.equal(await driver.ensureLocalFile(seedKey), seedFile);
    assert.deepEqual(calls, []);

    // Deleting a sample output never removes the file that ships with the repo.
    await driver.delete(seedKey);
    assert.equal((await fs.readFile(seedFile)).toString(), "0123456789");
    assert.equal(await driver.exists(seedKey), true);

    // Anything else falls through to the overlay.
    assert.equal((await driver.read("videos/2026-01-01/made-later.mp4")).toString(), "overlay");
    assert.equal(await driver.exists("videos/2026-01-01/made-later.mp4"), true);
    assert.equal(await driver.exists("videos/2026-01-01/missing.mp4"), false);
    assert.equal(await driver.exists(""), false);
    assert.equal(await driver.save("avatars", "new.png", Buffer.from("x")), "avatars/2026-01-01/new.png");

    // Paths cannot climb out of the sample folder.
    assert.equal(await driver.exists("../outside.txt"), false);
    await assert.rejects(driver.delete("../outside.txt"));
  } finally {
    await fs.rm(seedBase, { recursive: true, force: true });
  }
}

runDemoStorageTests()
  .then(() => console.log("demo storage tests passed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
