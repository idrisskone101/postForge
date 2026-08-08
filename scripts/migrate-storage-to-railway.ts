import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";
import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { parse } from "dotenv";
import { Pool } from "pg";

const execFileAsync = promisify(execFile);
const SENSITIVE_PREFIXES = ["integrations/"];

type Arguments = {
  bucketName: string;
  concurrency: number;
  statePath: string;
  reportPath: string;
};

type BucketCredentials = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;
  urlStyle: "virtual" | "virtual-host" | "path" | "path-style";
};

type SourceObject = {
  key: string;
  data: Buffer;
  source: "stored-asset" | "legacy-file";
};

type VerificationRecord = {
  key: string;
  size: number;
  sha256: string;
  source: SourceObject["source"];
  verifiedAt: string;
};

type MigrationStats = {
  discoveredObjects: number;
  discoveredBytes: number;
  uploadedObjects: number;
  uploadedBytes: number;
  resumedObjects: number;
  resumedBytes: number;
  verifiedObjects: number;
  verifiedBytes: number;
  retries: number;
  failures: Array<{ key: string; error: string }>;
  excludedSensitiveObjects: number;
  unrecoverableReferences: number;
  recoveredLegacyObjects: number;
  recoveredLegacyBytes: number;
};

function parseArguments(argv: string[]): Arguments {
  const result: Arguments = {
    bucketName: "postforge-media",
    concurrency: 3,
    statePath: path.resolve(".migration/railway-storage-state.jsonl"),
    reportPath: path.resolve(".migration/railway-storage-report.json"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];
    if (value === "--") {
      continue;
    } else if (value === "--bucket" && next) {
      result.bucketName = next;
      index += 1;
    } else if (value === "--concurrency" && next) {
      result.concurrency = Number(next);
      index += 1;
    } else if (value === "--state" && next) {
      result.statePath = path.resolve(next);
      index += 1;
    } else if (value === "--report" && next) {
      result.reportPath = path.resolve(next);
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${value}`);
    }
  }

  if (
    !Number.isSafeInteger(result.concurrency) ||
    result.concurrency < 1 ||
    result.concurrency > 8
  ) {
    throw new Error("--concurrency must be an integer between 1 and 8");
  }
  return result;
}

function readLocalEnvironment(): Record<string, string> {
  return parse(requireBuffer(".env"));
}

function requireBuffer(filename: string): Buffer {
  try {
    return readFileSync(filename);
  } catch {
    throw new Error(`${filename} is required for the migration source settings`);
  }
}

async function loadBucketCredentials(
  bucketName: string
): Promise<BucketCredentials> {
  const { stdout } = await execFileAsync(
    "railway",
    ["bucket", "credentials", "--bucket", bucketName, "--json"],
    { maxBuffer: 1024 * 1024 }
  );
  const parsed = JSON.parse(stdout) as Partial<BucketCredentials>;
  if (
    !parsed.endpoint ||
    !parsed.accessKeyId ||
    !parsed.secretAccessKey ||
    !parsed.bucketName ||
    !parsed.region ||
    !["virtual", "virtual-host", "path", "path-style"].includes(
      parsed.urlStyle ?? ""
    )
  ) {
    throw new Error("Railway returned incomplete bucket credentials");
  }
  return parsed as BucketCredentials;
}

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

async function loadVerifiedState(
  statePath: string
): Promise<Map<string, VerificationRecord>> {
  let contents: string;
  try {
    contents = await fs.readFile(statePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Map();
    throw error;
  }

  const records = new Map<string, VerificationRecord>();
  for (const line of contents.split("\n")) {
    if (!line.trim()) continue;
    const record = JSON.parse(line) as VerificationRecord;
    if (record.key && record.sha256 && Number.isSafeInteger(record.size)) {
      records.set(record.key, record);
    }
  }
  return records;
}

class StateWriter {
  private pending = Promise.resolve();

  constructor(private readonly statePath: string) {}

  append(record: VerificationRecord): Promise<void> {
    this.pending = this.pending.then(async () => {
      await fs.mkdir(path.dirname(this.statePath), { recursive: true });
      await fs.appendFile(this.statePath, `${JSON.stringify(record)}\n`, {
        mode: 0o600,
      });
    });
    return this.pending;
  }
}

async function retry<T>(
  operation: () => Promise<T>,
  stats: MigrationStats,
  attempts = 4
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      stats.retries += 1;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

async function hashBucketObject(
  client: S3Client,
  bucket: string,
  key: string
): Promise<{ size: number; sha256: string }> {
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
  if (!response.Body) throw new Error(`Bucket object has no body: ${key}`);

  const hash = createHash("sha256");
  let size = 0;
  const body = response.Body as unknown as {
    transformToByteArray?: () => Promise<Uint8Array>;
    [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array>;
  };
  if (typeof body.transformToByteArray === "function") {
    const bytes = Buffer.from(await body.transformToByteArray());
    hash.update(bytes);
    size = bytes.length;
  } else if (body[Symbol.asyncIterator]) {
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      const bytes = Buffer.from(chunk);
      hash.update(bytes);
      size += bytes.length;
    }
  } else {
    throw new Error(`Bucket object body is not readable: ${key}`);
  }
  return { size, sha256: hash.digest("hex") };
}

async function verifiedRemoteState(
  client: S3Client,
  bucket: string,
  source: SourceObject,
  checksum: string,
  previous: VerificationRecord | undefined
): Promise<boolean> {
  if (
    !previous ||
    previous.size !== source.data.length ||
    previous.sha256 !== checksum
  ) {
    return false;
  }
  try {
    const head = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: source.key })
    );
    return (
      head.ContentLength === source.data.length &&
      head.Metadata?.sha256 === checksum
    );
  } catch {
    return false;
  }
}

async function migrateObject(
  client: S3Client,
  bucket: string,
  source: SourceObject,
  previous: VerificationRecord | undefined,
  stateWriter: StateWriter,
  stats: MigrationStats
): Promise<void> {
  const checksum = sha256(source.data);
  if (
    await retry(
      () => verifiedRemoteState(client, bucket, source, checksum, previous),
      stats
    )
  ) {
    stats.resumedObjects += 1;
    stats.resumedBytes += source.data.length;
    stats.verifiedObjects += 1;
    stats.verifiedBytes += source.data.length;
    return;
  }

  await retry(
    () =>
      client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: source.key,
          Body: source.data,
          ContentLength: source.data.length,
          Metadata: { sha256: checksum },
        })
      ),
    stats
  );
  stats.uploadedObjects += 1;
  stats.uploadedBytes += source.data.length;

  const verified = await retry(
    () => hashBucketObject(client, bucket, source.key),
    stats
  );
  if (verified.size !== source.data.length || verified.sha256 !== checksum) {
    throw new Error(
      `Checksum verification failed for ${source.key}: expected ${source.data.length}/${checksum}, received ${verified.size}/${verified.sha256}`
    );
  }

  const record: VerificationRecord = {
    key: source.key,
    size: source.data.length,
    sha256: checksum,
    source: source.source,
    verifiedAt: new Date().toISOString(),
  };
  await stateWriter.append(record);
  stats.verifiedObjects += 1;
  stats.verifiedBytes += source.data.length;
}

async function migrateBatch(
  batch: SourceObject[],
  concurrency: number,
  migrate: (source: SourceObject) => Promise<void>
): Promise<void> {
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, batch.length) },
    async () => {
      while (nextIndex < batch.length) {
        const index = nextIndex;
        nextIndex += 1;
        await migrate(batch[index]);
      }
    }
  );
  await Promise.all(workers);
}

async function listBucketTotals(
  client: S3Client,
  bucket: string
): Promise<{ objects: number; bytes: number }> {
  let continuationToken: string | undefined;
  let objects = 0;
  let bytes = 0;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      })
    );
    for (const object of page.Contents ?? []) {
      objects += 1;
      bytes += object.Size ?? 0;
    }
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);
  return { objects, bytes };
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const localEnvironment = readLocalEnvironment();
  if (!localEnvironment.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing from .env");
  }
  const legacyBasePath = localEnvironment.STORAGE_LOCAL_PATH
    ? path.resolve(localEnvironment.STORAGE_LOCAL_PATH)
    : path.resolve("./data/outputs");

  const credentials = await loadBucketCredentials(args.bucketName);
  const client = new S3Client({
    endpoint: credentials.endpoint,
    region: credentials.region,
    forcePathStyle:
      credentials.urlStyle === "path" || credentials.urlStyle === "path-style",
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });
  const sourcePool = new Pool({ connectionString: localEnvironment.DATABASE_URL });
  const previousState = await loadVerifiedState(args.statePath);
  const stateWriter = new StateWriter(args.statePath);
  const stats: MigrationStats = {
    discoveredObjects: 0,
    discoveredBytes: 0,
    uploadedObjects: 0,
    uploadedBytes: 0,
    resumedObjects: 0,
    resumedBytes: 0,
    verifiedObjects: 0,
    verifiedBytes: 0,
    retries: 0,
    failures: [],
    excludedSensitiveObjects: 0,
    unrecoverableReferences: 0,
    recoveredLegacyObjects: 0,
    recoveredLegacyBytes: 0,
  };

  try {
    let cursor = "";
    const batchSize = Math.max(args.concurrency * 2, 8);
    while (true) {
      const result = await sourcePool.query<{ key: string; data: Buffer }>(
        `SELECT "key", "data"
         FROM "StoredAsset"
         WHERE "key" > $1
         ORDER BY "key"
         LIMIT $2`,
        [cursor, batchSize]
      );
      if (result.rows.length === 0) break;
      cursor = result.rows[result.rows.length - 1].key;

      const batch: SourceObject[] = [];
      for (const row of result.rows) {
        if (isSensitiveKey(row.key)) {
          stats.excludedSensitiveObjects += 1;
          continue;
        }
        stats.discoveredObjects += 1;
        stats.discoveredBytes += row.data.length;
        batch.push({ key: row.key, data: row.data, source: "stored-asset" });
      }

      await migrateBatch(batch, args.concurrency, async (source) => {
        try {
          await migrateObject(
            client,
            credentials.bucketName,
            source,
            previousState.get(source.key),
            stateWriter,
            stats
          );
        } catch (error) {
          stats.failures.push({
            key: source.key,
            error: safeErrorMessage(error),
          });
        }
      });

      if (stats.discoveredObjects % 100 < batchSize) {
        console.log(
          JSON.stringify({
            phase: "stored-assets",
            discoveredObjects: stats.discoveredObjects,
            verifiedObjects: stats.verifiedObjects,
            verifiedBytes: stats.verifiedBytes,
            failures: stats.failures.length,
            retries: stats.retries,
          })
        );
      }
    }

    const missingReferences = await sourcePool.query<{ key: string }>(
      `WITH refs AS (
         SELECT "localPath" AS key FROM "GeneratedFile" WHERE "localPath" <> ''
         UNION SELECT "localPath" FROM "Avatar" WHERE "localPath" <> ''
         UNION SELECT "localPath" FROM "AvatarIdentityImage" WHERE "localPath" <> ''
         UNION SELECT "localPath" FROM "TikTokSource" WHERE "localPath" <> ''
         UNION SELECT "thumbnailPath" FROM "TikTokSource"
           WHERE "thumbnailPath" IS NOT NULL AND "thumbnailPath" <> ''
         UNION SELECT "localPath" FROM "UgcReferenceImage" WHERE "localPath" <> ''
       )
       SELECT refs.key
       FROM refs
       LEFT JOIN "StoredAsset" asset USING (key)
       WHERE asset.key IS NULL
       ORDER BY refs.key`
    );

    const legacyBatch: SourceObject[] = [];
    for (const { key } of missingReferences.rows) {
      if (isSensitiveKey(key)) {
        stats.excludedSensitiveObjects += 1;
        continue;
      }
      try {
        const data = await fs.readFile(path.resolve(legacyBasePath, key));
        stats.discoveredObjects += 1;
        stats.discoveredBytes += data.length;
        stats.recoveredLegacyObjects += 1;
        stats.recoveredLegacyBytes += data.length;
        legacyBatch.push({ key, data, source: "legacy-file" });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        stats.unrecoverableReferences += 1;
      }
    }

    await migrateBatch(legacyBatch, args.concurrency, async (source) => {
      try {
        await migrateObject(
          client,
          credentials.bucketName,
          source,
          previousState.get(source.key),
          stateWriter,
          stats
        );
      } catch (error) {
        stats.failures.push({ key: source.key, error: safeErrorMessage(error) });
      }
    });

    const bucketTotals = await retry(
      () => listBucketTotals(client, credentials.bucketName),
      stats
    );
    const report = {
      completedAt: new Date().toISOString(),
      bucketDisplayName: args.bucketName,
      bucketApiRegion: credentials.region,
      ...stats,
      bucketObjects: bucketTotals.objects,
      bucketBytes: bucketTotals.bytes,
    };
    await fs.mkdir(path.dirname(args.reportPath), { recursive: true });
    await fs.writeFile(args.reportPath, `${JSON.stringify(report, null, 2)}\n`, {
      mode: 0o600,
    });
    console.log(JSON.stringify(report));
    if (stats.failures.length > 0) process.exitCode = 1;
  } finally {
    await sourcePool.end();
    client.destroy();
  }
}

void main().catch((error) => {
  console.error(safeErrorMessage(error));
  process.exitCode = 1;
});
