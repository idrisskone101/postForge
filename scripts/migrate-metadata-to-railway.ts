import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { parse } from "dotenv";
import { Pool, type PoolClient, type PoolConfig } from "pg";

const execFileAsync = promisify(execFile);

const TABLE_ORDER = [
  "GenerationJob",
  "CostLog",
  "InspirationAccount",
  "InspirationVideo",
  "SlideshowProject",
  "Avatar",
  "AvatarIdentityPack",
  "AvatarIdentityImage",
  "TikTokSource",
  "GeneratedFile",
  "UgcReferenceImage",
  "SlideshowSlide",
  "SlideshowAutomation",
  "StoredAsset",
] as const;

type TableName = (typeof TABLE_ORDER)[number];

const PRIMARY_KEYS: Record<TableName, string> = {
  GenerationJob: "id",
  CostLog: "id",
  InspirationAccount: "id",
  InspirationVideo: "id",
  SlideshowProject: "id",
  Avatar: "id",
  AvatarIdentityPack: "id",
  AvatarIdentityImage: "id",
  TikTokSource: "id",
  GeneratedFile: "id",
  UgcReferenceImage: "id",
  SlideshowSlide: "id",
  SlideshowAutomation: "id",
  StoredAsset: "key",
};

const OMITTED_COLUMNS: Partial<Record<TableName, Set<string>>> = {
  GeneratedFile: new Set(["data"]),
  Avatar: new Set(["data"]),
  TikTokSource: new Set(["data", "thumbnailData"]),
};

type Arguments = {
  bucketName: string;
  statePath: string;
  reportPath: string;
  targetHost: string;
  targetPort: number;
  dryRun: boolean;
};

type BucketCredentials = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;
  urlStyle: "virtual" | "virtual-host" | "path" | "path-style";
};

type VerificationRecord = {
  key: string;
  size: number;
  sha256: string;
  source: "stored-asset" | "legacy-file";
  verifiedAt: string;
};

type TableReport = {
  sourceRows: number;
  upsertedRows: number;
  targetRows: number;
};

function parseArguments(argv: string[]): Arguments {
  const result: Arguments = {
    bucketName: "postforge-media",
    statePath: path.resolve(".migration/railway-storage-state.jsonl"),
    reportPath: path.resolve(".migration/railway-metadata-report.json"),
    targetHost: "127.0.0.1",
    targetPort: 65432,
    dryRun: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];
    if (value === "--") {
      continue;
    } else if (value === "--bucket" && next) {
      result.bucketName = next;
      index += 1;
    } else if (value === "--state" && next) {
      result.statePath = path.resolve(next);
      index += 1;
    } else if (value === "--report" && next) {
      result.reportPath = path.resolve(next);
      index += 1;
    } else if (value === "--target-host" && next) {
      result.targetHost = next;
      index += 1;
    } else if (value === "--target-port" && next) {
      result.targetPort = Number(next);
      index += 1;
    } else if (value === "--dry-run") {
      result.dryRun = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${value}`);
    }
  }
  if (!Number.isSafeInteger(result.targetPort) || result.targetPort < 1) {
    throw new Error("--target-port must be a valid TCP port");
  }
  return result;
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

async function loadVerifiedState(
  statePath: string
): Promise<Map<string, VerificationRecord>> {
  const records = new Map<string, VerificationRecord>();
  const contents = await fs.readFile(statePath, "utf8");
  for (const line of contents.split("\n")) {
    if (!line.trim()) continue;
    const record = JSON.parse(line) as VerificationRecord;
    if (record.key && record.sha256 && Number.isSafeInteger(record.size)) {
      records.set(record.key, record);
    }
  }
  return records;
}

async function parallelMap<T>(
  values: T[],
  concurrency: number,
  operation: (value: T) => Promise<void>
): Promise<void> {
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (nextIndex < values.length) {
        const index = nextIndex;
        nextIndex += 1;
        await operation(values[index]);
      }
    })
  );
}

async function verifyBucketPreflight(
  source: Pool,
  state: Map<string, VerificationRecord>,
  client: S3Client,
  bucket: string
): Promise<{
  verifiedObjects: number;
  verifiedBytes: number;
  referencedObjects: number;
  unrecoverableReferences: number;
}> {
  const storedAssets = await source.query<{ key: string; size: number }>(
    `SELECT "key", octet_length("data")::integer AS size
     FROM "StoredAsset"
     WHERE "key" NOT LIKE 'integrations/%'
     ORDER BY "key"`
  );
  const references = await source.query<{ key: string; stored: boolean }>(
    `WITH refs AS (
       SELECT "localPath" AS key FROM "GeneratedFile" WHERE "localPath" <> ''
       UNION SELECT "localPath" FROM "Avatar" WHERE "localPath" <> ''
       UNION SELECT "localPath" FROM "AvatarIdentityImage" WHERE "localPath" <> ''
       UNION SELECT "localPath" FROM "TikTokSource" WHERE "localPath" <> ''
       UNION SELECT "thumbnailPath" FROM "TikTokSource"
         WHERE "thumbnailPath" IS NOT NULL AND "thumbnailPath" <> ''
       UNION SELECT "localPath" FROM "UgcReferenceImage" WHERE "localPath" <> ''
     )
     SELECT refs.key, asset.key IS NOT NULL AS stored
     FROM refs
     LEFT JOIN "StoredAsset" asset USING (key)
     ORDER BY refs.key`
  );

  const required = new Map<string, number>();
  for (const object of storedAssets.rows) required.set(object.key, object.size);
  let unrecoverableReferences = 0;
  for (const reference of references.rows) {
    if (reference.stored) continue;
    const record = state.get(reference.key);
    if (record?.source === "legacy-file") {
      required.set(reference.key, record.size);
    } else {
      unrecoverableReferences += 1;
    }
  }

  let verifiedBytes = 0;
  await parallelMap([...required.entries()], 12, async ([key, expectedSize]) => {
    const record = state.get(key);
    if (!record || record.size !== expectedSize) {
      throw new Error(`Missing verified migration state for ${key}`);
    }
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    if (
      head.ContentLength !== expectedSize ||
      head.Metadata?.sha256 !== record.sha256
    ) {
      throw new Error(`Bucket preflight mismatch for ${key}`);
    }
    verifiedBytes += expectedSize;
  });

  return {
    verifiedObjects: required.size,
    verifiedBytes,
    referencedObjects: references.rowCount ?? references.rows.length,
    unrecoverableReferences,
  };
}

async function columnsForTable(
  source: Pool,
  table: TableName
): Promise<string[]> {
  const result = await source.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table]
  );
  const omitted = OMITTED_COLUMNS[table] ?? new Set<string>();
  return result.rows
    .map((row) => row.column_name)
    .filter((column) => !omitted.has(column));
}

async function countSourceRows(source: Pool, table: TableName): Promise<number> {
  const where =
    table === "StoredAsset"
      ? ` WHERE "key" LIKE 'workspace-features/%' AND "key" NOT LIKE 'integrations/%'`
      : "";
  const result = await source.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM ${quoteIdentifier(table)}${where}`
  );
  return Number(result.rows[0].count);
}

async function copyTable(
  source: Pool,
  target: PoolClient,
  table: TableName
): Promise<{ sourceRows: number; upsertedRows: number }> {
  const columns = await columnsForTable(source, table);
  if (columns.length === 0) throw new Error(`No columns found for ${table}`);
  const primaryKey = PRIMARY_KEYS[table];
  const where =
    table === "StoredAsset"
      ? ` WHERE "key" LIKE 'workspace-features/%' AND "key" NOT LIKE 'integrations/%'`
      : "";
  const rows = await source.query<Record<string, unknown>>(
    `SELECT ${columns.map(quoteIdentifier).join(", ")}
     FROM ${quoteIdentifier(table)}${where}
     ORDER BY ${quoteIdentifier(primaryKey)}`
  );

  let upsertedRows = 0;
  const batchSize = 100;
  for (let offset = 0; offset < rows.rows.length; offset += batchSize) {
    const batch = rows.rows.slice(offset, offset + batchSize);
    const values: unknown[] = [];
    const tuples = batch.map((row) => {
      const placeholders = columns.map((column) => {
        values.push(row[column] ?? null);
        return `$${values.length}`;
      });
      return `(${placeholders.join(", ")})`;
    });
    const mutableColumns = columns.filter((column) => column !== primaryKey);
    const update = mutableColumns
      .map(
        (column) =>
          `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`
      )
      .join(", ");
    const result = await target.query(
      `INSERT INTO ${quoteIdentifier(table)} (${columns
        .map(quoteIdentifier)
        .join(", ")}) VALUES ${tuples.join(", ")}
       ON CONFLICT (${quoteIdentifier(primaryKey)}) DO UPDATE SET ${update}`,
      values
    );
    upsertedRows += result.rowCount ?? 0;
  }
  return { sourceRows: rows.rows.length, upsertedRows };
}

function targetPoolConfig(args: Arguments): PoolConfig {
  if (process.env.TARGET_DATABASE_URL) {
    return { connectionString: process.env.TARGET_DATABASE_URL };
  }
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DB;
  if (!user || !password || !database) {
    throw new Error(
      "Target credentials are missing; run this command through `railway run --service Postgres`"
    );
  }
  return {
    host: args.targetHost,
    port: args.targetPort,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
    application_name: "postforge-metadata-migration",
  };
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const localEnvironment = parse(readFileSync(".env"));
  if (!localEnvironment.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing from .env");
  }
  const source = new Pool({ connectionString: localEnvironment.DATABASE_URL });
  const credentials = await loadBucketCredentials(args.bucketName);
  const s3 = new S3Client({
    endpoint: credentials.endpoint,
    region: credentials.region,
    forcePathStyle:
      credentials.urlStyle === "path" || credentials.urlStyle === "path-style",
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });
  let target: Pool | undefined;

  try {
    const state = await loadVerifiedState(args.statePath);
    const bucketPreflight = await verifyBucketPreflight(
      source,
      state,
      s3,
      credentials.bucketName
    );
    const sourceCounts = Object.fromEntries(
      await Promise.all(
        TABLE_ORDER.map(async (table) => [table, await countSourceRows(source, table)])
      )
    ) as Record<TableName, number>;
    const sourceSecretRecords = Number(
      (
        await source.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM "StoredAsset" WHERE "key" LIKE 'integrations/%'`
        )
      ).rows[0].count
    );

    if (args.dryRun) {
      console.log(
        JSON.stringify({
          dryRun: true,
          bucketPreflight,
          sourceCounts,
          excludedLocalProviderSecretRecords: sourceSecretRecords,
        })
      );
      return;
    }

    target = new Pool(targetPoolConfig(args));
    const targetClient = await target.connect();
    const tables = {} as Record<TableName, TableReport>;
    try {
      await targetClient.query("BEGIN");
      await targetClient.query("SET LOCAL statement_timeout = 0");
      for (const table of TABLE_ORDER) {
        const copied = await copyTable(source, targetClient, table);
        const targetCount = Number(
          (
            await targetClient.query<{ count: string }>(
              `SELECT count(*)::text AS count FROM ${quoteIdentifier(table)}`
            )
          ).rows[0].count
        );
        if (targetCount < copied.sourceRows) {
          throw new Error(`Target row count is short for ${table}`);
        }
        tables[table] = { ...copied, targetRows: targetCount };
        console.log(JSON.stringify({ phase: "metadata", table, ...tables[table] }));
      }

      const legacyBytes = await targetClient.query<{ bytes: string }>(
        `SELECT (
           COALESCE((SELECT sum(octet_length("data")) FROM "GeneratedFile"), 0) +
           COALESCE((SELECT sum(octet_length("data")) FROM "Avatar"), 0) +
           COALESCE((SELECT sum(octet_length("data")) FROM "TikTokSource"), 0) +
           COALESCE((SELECT sum(octet_length("thumbnailData")) FROM "TikTokSource"), 0)
         )::text AS bytes`
      );
      if (Number(legacyBytes.rows[0].bytes) !== 0) {
        throw new Error("Target still contains redundant legacy media blobs");
      }
      await targetClient.query("COMMIT");

      const databaseSize = await target.query<{ bytes: string }>(
        `SELECT pg_database_size(current_database())::text AS bytes`
      );
      const report = {
        completedAt: new Date().toISOString(),
        bucketPreflight,
        tables,
        excludedLocalProviderSecretRecords: sourceSecretRecords,
        redundantLegacyBlobBytes: 0,
        targetDatabaseBytes: Number(databaseSize.rows[0].bytes),
      };
      await fs.mkdir(path.dirname(args.reportPath), { recursive: true });
      await fs.writeFile(args.reportPath, `${JSON.stringify(report, null, 2)}\n`, {
        mode: 0o600,
      });
      console.log(JSON.stringify(report));
    } catch (error) {
      await targetClient.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      targetClient.release();
    }
  } finally {
    await source.end();
    if (target) await target.end();
    s3.destroy();
  }
}

void main().catch((error) => {
  const message = safeErrorMessage(error);
  const digest = createHash("sha256").update(message).digest("hex").slice(0, 12);
  console.error(`Metadata migration failed (${digest}): ${message}`);
  process.exitCode = 1;
});
