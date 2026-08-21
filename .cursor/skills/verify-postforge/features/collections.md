# Collections

Collections is the reusable image library: empty-state guidance, upload entry, and search over loose assets.

## Sub-features

- `collections-open` reaches the library from nav.
- `collections-empty` shows empty library copy and first-upload CTA.
- `collections-upload-entry` reaches upload via header CTA or `?upload=1`.

## How to get to it (user POV)

- Choose `Collections` in workspace navigation.
- Open `/collections` or `/collections?upload=1`.
- Choose header CTA `Upload Images` when present.

## Driving it with control-postforge

Preconditions:

- Doctor is green.
- File upload proof is optional; entry-point reachability is required.

- **Open library.** Run `control-postforge browser goto /collections`. Heading reflects Collections.
- **Empty guidance.** Snapshot `$PROOF_DIR/collections/library.aria.txt`. Empty state may include copy about the reusable image library and a button `Upload your first images` or similar; populated state may show `Drop images anywhere to upload` and `Search assets`.
- **Upload entry.** Run `control-postforge browser goto /collections?upload=1` or click `Upload Images`. The upload affordance is visible (file input, drop zone, or dialog) without inventing assets.
- **Proof.** Screenshot `$PROOF_DIR/collections/collections.png` at `1440x1024`.

## Gotchas

- Pinterest import may be unavailable without credentials; that is expected and must stay explicit.
- Do not seed binary assets into the repo root; use `/tmp` fixtures if uploading.
