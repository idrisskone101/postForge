# Railway storage migration

PostForge production uses a private Railway Storage Bucket through the existing
`StorageProvider` interface. Media keys remain unchanged, `/api/files` remains
the authenticated application boundary, and video byte ranges are proxied from
the bucket.

## Production variables

Set these on the `postforge` service with Railway variable references. Do not
copy credential values into a local file, command log, Git, or client-visible
configuration.

```text
STORAGE_DRIVER=s3
STORAGE_S3_BUCKET=${{postforge-media.BUCKET}}
STORAGE_S3_ENDPOINT=${{postforge-media.ENDPOINT}}
STORAGE_S3_REGION=auto
STORAGE_S3_ACCESS_KEY_ID=${{postforge-media.ACCESS_KEY_ID}}
STORAGE_S3_SECRET_ACCESS_KEY=${{postforge-media.SECRET_ACCESS_KEY}}
STORAGE_S3_URL_STYLE=virtual
```

Apply all seven values with deploys skipped, then trigger one deployment. This
keeps the driver and its complete credential set atomic from the application's
point of view.

## Object migration

The object migration reads the local Postgres source without modifying it. It
uses bounded concurrency, appends verified SHA-256 state under `.migration/`,
and resumes by matching the source checksum, remote size, remote checksum
metadata, and the prior verification record. A new upload is downloaded again
and hashed before it is marked verified.

```bash
pnpm storage:migrate:railway -- --bucket postforge-media --concurrency 3
```

Railway credentials are obtained inside the process and are never printed. The
script excludes any `integrations/*` records if they exist. Missing database
references are recovered from `STORAGE_LOCAL_PATH` when possible and otherwise
reported as pre-existing source gaps.

## Metadata restore

Run the source-to-target preflight after object migration. The restore upserts
rows in foreign-key order and never truncates Railway tables. The legacy media
columns on `GeneratedFile`, `Avatar`, and `TikTokSource` are omitted, while only
the small `workspace-features/*` `StoredAsset` records are retained. Local
`integrations/*` records are never copied.

```bash
pnpm storage:migrate:metadata -- --dry-run
railway connect Postgres --ssh --tunnel-only --port 65432
railway run --service Postgres pnpm storage:migrate:metadata
```

The second and third commands run in separate terminals while the tunnel is
active. The restore is one transaction and writes a count/size report under
`.migration/`.

## Verification

Before switching the driver, verify that the object report has no migration
failures, the bucket aggregate matches the verified aggregate, every available
referenced object passes the remote size/checksum preflight, metadata table
counts match, and redundant legacy blob bytes are zero. After deployment,
verify full and ranged reads, downloads, one harmless write/delete probe, and
all primary routes without generating paid media or publishing.

## Rollback

Do not delete the local database, local media directory, bucket, or existing
Railway database. To return to the pre-cutover service state, atomically set
`STORAGE_DRIVER=database` with deploys skipped and redeploy the last known-good
pre-S3 commit. This restores the pre-migration Railway behavior; the complete
historical source remains local for a corrected forward migration. Because
Railway Buckets do not currently provide object versioning or lifecycle rules,
the local source is the durable rollback copy.
