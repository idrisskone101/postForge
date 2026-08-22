# Inspiration

Inspiration lists tracked TikTok posts and lets the user send one into Clone with **Use in Clone**. The click must leave `/ugc-inspiration` and land on `/ugc-clone` with that post's URL or saved source selected.

## Sub-features

- `inspiration-library` opens the source library from nav or `/ugc-inspiration`.
- `inspiration-populated` shows video cards with **Use in Clone** when rows exist.
- `inspiration-use-in-clone` hands the selected post to Clone (card button and preview dialog).
- `inspiration-handoff-existing` auto-selects a matching saved `TikTokSource` on Clone.
- `inspiration-handoff-needs-download` fills Clone's TikTok URL and lets Clone own import failure.

## How to get to it (user POV)

- Choose `Inspiration` in workspace navigation.
- Open `/ugc-inspiration`.
- On a card, choose **Use in Clone**, or open preview and choose **Use in Clone** there.

## Driving it with control-postforge

Preconditions:

- Doctor is green.
- Feature tables are not empty. If `InspirationVideo` count is 0, seed before driving (see Gotchas). You need both fixture shapes: a video with a stored `TikTokSource`, and a video with no stored source.
- No requirement for yt-dlp, fal, or OAuth. Missing yt-dlp must stay a real error on Clone, not a reason to stay on Inspiration.

- **Open Inspiration.** Run `control-postforge browser goto /ugc-inspiration`. The heading is `Inspiration` and navigation marks Inspiration current.
- **Confirm cards.** Snapshot `$PROOF_DIR/inspiration/library.aria.txt`. Cards expose `Use in Clone`. An empty library is a seed miss, not a product pass.
- **Probe the handoff API first** when isolating a navigation bug. `POST /api/ugc-inspiration/videos/:id/use` splits a client miss from a server download/materialization failure. Do not treat a 500 from that route as proof that the button should stay on Inspiration.
- **Use in Clone (needs-download).** Scope the click to the card with no stored source (`[data-inspiration-video-id]` filtered by caption, then `getByRole('button', { name: /^Use in Clone$/i })`). Do not use page-wide `control-postforge browser click --role button --name "Use in Clone"`. Wait for `/ugc-clone`. Clone heading is visible, sidebar Clone is `aria-current="page"`, and the TikTok URL field contains the handed-off URL. A real `spawn yt-dlp ENOENT` (or other import error) on Clone is expected when the downloader is missing.
- **Use in Clone (existing source).** Repeat on the stored-source card. Clone may hide the URL field once the source is selected and advance to Who. Source-complete plus composition preview counts as handoff success.
- **Temporal proof.** Record `RecordScreen` of the click through the route change, or keep one Playwright session with `page.waitForURL(/\/ugc-clone/)`. A screenshot of Clone after a separate navigation is not enough.
- **Proof.** Screenshot `$PROOF_DIR/inspiration/clone-after-handoff.png` on the Clone destination.

## Gotchas

- Fresh Cloud VMs often have zero Inspiration rows. Seed from the repo root (`pnpm exec tsx`) so `@/` imports resolve. Scripts under `/tmp` break those imports.
- `control-postforge browser click` uses page-wide `.first()`. Repeated **Use in Clone** buttons need a card-scoped locator and `waitForURL`.
- Cross-route Inspiration→Clone handoff uses `window.location.assign(href)`, not `useRouter().push`. The static Inspiration render test fails if that hook is mounted.
- Do not invent demo TikTok sources. Unavailable download stays an error on Clone.
- "Used in Clone" on the Inspiration card updates after Clone import, not at the click.
- KS-10 tracks a checked-in `scripts/seed-inspiration-fixtures.ts`. Until it lands, keep the two Prisma fixture shapes above.
