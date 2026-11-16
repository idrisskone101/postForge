# Demo workspace

PostForge is a single-operator tool with one shared key and one database. The
demo workspace is how someone else can look at it without seeing the operator's
real generations: the same code, deployed a second time as a **demo build**
with its own database that only ever holds sample content.

The sample content is for Loamly, a fictional plant-care app. The media was
generated with the same models the app uses and ships in `demo/assets/`.

## What a demo build does differently

A demo build is one built with `NEXT_PUBLIC_POSTFORGE_DEMO_MODE=1`. Next
inlines the flag, so the shell, the middleware and the server always agree.

| Area | Demo build |
| --- | --- |
| Access | Open to visitors. `POSTFORGE_API_KEY` is not consulted. |
| Data | A dedicated database, wiped and re-seeded at boot and every `POSTFORGE_DEMO_RESET_MINUTES` (default 60). Sample rows keep stable ids, so open links survive a restore. |
| Media | Served read-only from `demo/assets/`. Deleting a sample output removes the row, never the file. Anything the app writes at runtime goes to the demo database as an overlay and is cleared by the next restore. `STORAGE_DRIVER` is ignored, so the operator's bucket is never touched. |
| Editing | Visitors can review, edit, reorder and delete the sample content. |
| Generation, uploads, providers | Refused by the middleware with a 403 and a visible notice. Mutating routes are an allowlist in `src/lib/demo/request-policy.ts`; a new route is closed until it is added there. |
| Inspiration | Not part of the demo. The tab is removed, `/ugc-inspiration` redirects to Home, and its API returns 404. |
| Limits | Open access means anyone can write, so writes are bounded: request bodies over 64 KB are refused, edits and heavy renders (exports, thumbnails) are capped at 30 a minute per visitor and 120 overall, and the workspace is restored early if it grows past 1,500 rows or 25 MB of stored JSON. |
| Background work | The fal poller, clone worker, automation scheduler, slideshow automation worker and storage backfills do not start. |
| Slides | May only reference media already in the workspace, so a visitor cannot point a slide at a remote or inline image. |
| Connections | TikTok, Instagram and YouTube stay "not connected". Performance reads one local CSV dataset named `loamly-sample-posts.csv`. |

One visitor's edits are visible to other visitors until the next restore.

## Safety guard

A restore deletes every row before it writes the sample set. It only runs when
the database carries the demo marker (`demo/workspace-marker.json` in
`StoredAsset`) or is completely empty. Against any other database the build
logs the reason and exits before it serves a request. Setting the flag on the
real deployment therefore takes the site down rather than exposing or deleting
real work.

Do not give the demo service any provider secrets (`FAL_KEY`,
`OLLAMA_API_KEY`, `VIRLO_API_KEY`, OAuth client secrets, bucket credentials).
Nothing in a demo build needs them.

## Deploying it (Railway)

1. Add a new Postgres service used only by the demo.
2. Add a second app service from this repository.
3. On that service set:
   - `DATABASE_URL` to the demo Postgres (never the production one)
   - `NEXT_PUBLIC_POSTFORGE_DEMO_MODE=1`
   - `NEXT_PUBLIC_BASE_URL` and `POSTFORGE_PUBLIC_URL` to the demo URL
4. Deploy. `prisma migrate deploy` creates the schema, and the first boot
   seeds the workspace.

## Working on the sample set

- `demo/assets/manifest.json` lists every sample file with its prompt, model
  and dimensions. The seed in `src/lib/demo/seed/` turns it into rows; prices
  come from the model registry.
- `pnpm demo:seed` restores a local demo database by hand. Point
  `DATABASE_URL` at a scratch database first.
- Local demo build: `NEXT_PUBLIC_POSTFORGE_DEMO_MODE=1 pnpm build`, then
  `pnpm start` with the same variable and the demo `DATABASE_URL`.
- `pnpm test:demo` covers the request policy, the storage layer, the slide
  media rule and the seed.
