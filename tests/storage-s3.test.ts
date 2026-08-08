import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { parseSingleByteRange } from "../src/lib/http-byte-range";
import {
  RailwayS3StorageDriver,
  railwayS3StorageConfigFromEnvironment,
} from "../src/lib/storage";

const config = railwayS3StorageConfigFromEnvironment({
  STORAGE_S3_BUCKET: "postforge-media-test",
  STORAGE_S3_ENDPOINT: "https://storage.test",
  STORAGE_S3_REGION: "auto",
  STORAGE_S3_ACCESS_KEY_ID: "test-access-key",
  STORAGE_S3_SECRET_ACCESS_KEY: "test-secret-key",
  STORAGE_S3_URL_STYLE: "virtual",
});

assert.equal(config.forcePathStyle, false);
assert.throws(
  () =>
    railwayS3StorageConfigFromEnvironment({
      STORAGE_S3_BUCKET: "bucket",
      STORAGE_S3_ENDPOINT: "https://storage.test",
      STORAGE_S3_REGION: "auto",
      STORAGE_S3_ACCESS_KEY_ID: "access",
      STORAGE_S3_SECRET_ACCESS_KEY: "secret",
      STORAGE_S3_URL_STYLE: "invalid",
    }),
  /virtual, virtual-host, path, or path-style/
);

assert.deepEqual(parseSingleByteRange(null, 100), null);
assert.deepEqual(parseSingleByteRange("bytes=10-19", 100), {
  start: 10,
  end: 19,
});
assert.deepEqual(parseSingleByteRange("bytes=90-", 100), {
  start: 90,
  end: 99,
});
assert.deepEqual(parseSingleByteRange("bytes=-10", 100), {
  start: 90,
  end: 99,
});
assert.throws(() => parseSingleByteRange("bytes=100-101", 100), RangeError);
assert.throws(() => parseSingleByteRange("bytes=0-1,3-4", 100), RangeError);

const objectData = new Map<string, Buffer>();
const observedCommands: Array<
  PutObjectCommand | GetObjectCommand | HeadObjectCommand | DeleteObjectCommand
> = [];
const fakeClient = {
  async send(
    command: PutObjectCommand | GetObjectCommand | HeadObjectCommand | DeleteObjectCommand
  ) {
    observedCommands.push(command);
    const key = String(command.input.Key);
    if (command instanceof PutObjectCommand) {
      objectData.set(key, Buffer.from(command.input.Body as Uint8Array));
      return {};
    }
    if (command instanceof GetObjectCommand) {
      const data = objectData.get(key);
      if (!data) {
        throw Object.assign(new Error("missing"), {
          name: "NoSuchKey",
          $metadata: { httpStatusCode: 404 },
        });
      }
      const match = /^bytes=(\d+)-(\d+)$/.exec(command.input.Range ?? "");
      const response = match
        ? data.subarray(Number(match[1]), Number(match[2]) + 1)
        : data;
      return {
        Body: {
          transformToByteArray: async () => Uint8Array.from(response),
        },
      };
    }
    if (command instanceof HeadObjectCommand) {
      const data = objectData.get(key);
      if (!data) {
        throw Object.assign(new Error("missing"), {
          name: "NotFound",
          $metadata: { httpStatusCode: 404 },
        });
      }
      return { ContentLength: data.length };
    }
    if (command instanceof DeleteObjectCommand) {
      objectData.delete(key);
      return {};
    }
    throw new Error("Unexpected command");
  },
};

async function runStorageTests() {
  const cacheDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "postforge-s3-test-")
  );
  try {
    const driver = new RailwayS3StorageDriver(config, {
      client: fakeClient as unknown as S3Client,
      cacheBasePath: cacheDirectory,
    });
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
    assert.equal((await fs.readFile(localFile)).toString(), "0123456789");
    const getCount = observedCommands.filter(
      (command) => command instanceof GetObjectCommand
    ).length;
    assert.equal(await driver.ensureLocalFile(savedPath), localFile);
    assert.equal(
      observedCommands.filter((command) => command instanceof GetObjectCommand)
        .length,
      getCount
    );

    await driver.delete(savedPath);
    assert.equal(await driver.exists(savedPath), false);
    await assert.rejects(() => driver.read(savedPath), { code: "ENOENT" });
  } finally {
    await fs.rm(cacheDirectory, { recursive: true, force: true });
  }
}

void runStorageTests()
  .then(() => console.log("Railway S3 storage and byte-range tests passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
