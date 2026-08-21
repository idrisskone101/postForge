import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { LocalStorageDriver } from "../../src/lib/storage/local";

async function runLocalStorageTests() {
  const basePath = await fs.mkdtemp(path.join(os.tmpdir(), "postforge-local-test-"));
  try {
    const driver = new LocalStorageDriver(basePath);
    const savedPath = await driver.save(
      "videos",
      "example.mp4",
      Buffer.from("0123456789")
    );
    assert.match(savedPath, /^videos\/\d{4}-\d{2}-\d{2}\/example\.mp4$/);
    assert.equal(await driver.exists(savedPath), true);
    assert.equal(await driver.size(savedPath), 10);
    assert.equal((await driver.read(savedPath)).toString(), "0123456789");
    assert.equal((await driver.readRange(savedPath, 2, 5)).toString(), "2345");

    const localFile = await driver.ensureLocalFile(savedPath);
    assert.equal(path.resolve(localFile), localFile);
    assert.equal((await fs.readFile(localFile)).toString(), "0123456789");

    await driver.delete(savedPath);
    assert.equal(await driver.exists(savedPath), false);
    await assert.rejects(() => driver.read(savedPath), { code: "ENOENT" });
  } finally {
    await fs.rm(basePath, { recursive: true, force: true });
  }
}

void runLocalStorageTests()
  .then(() => console.log("Local storage tests passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
