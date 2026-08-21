# Slideshow drafts

Slideshow studio lets a user open Create and Drafts, start a new slideshow, and manage draft storyboards without requiring remote image hosts or Ollama for entry-point proof.

## Sub-features

- `slideshow-open` reaches the studio from nav.
- `slideshow-tabs` switches Create vs Drafts.
- `slideshow-new` opens a new slideshow via CTA or `?new=true`.
- `slideshow-drafts-filter` shows draft status filters when drafts exist.

## How to get to it (user POV)

- Choose `Slideshow` in workspace navigation.
- Open `/slideshow` or `/slideshow?new=true`.
- Choose header CTA `New Slideshow`.

## Driving it with control-postforge

Preconditions:

- Doctor is green.
- AI story generation may be unavailable without Ollama; studio chrome must still render.

- **Open studio.** Run `control-postforge browser goto /slideshow`. Locate `nav[aria-label="Slideshow studio"]` or tabs named `Create` / `Drafts`.
- **Create tab.** Click the tab `Create` if not selected. Snapshot `$PROOF_DIR/slideshow/create.aria.txt`. Expect story prompt affordances such as `What is the story about?` when the generate section mounts (`section[aria-label="Generate a slideshow with AI"]` may be present).
- **Drafts tab.** Click the tab `Drafts`. Filters may appear as `aria-label="Filter drafts by status"`. Empty drafts is a valid state.
- **New slideshow.** Run `control-postforge browser goto /slideshow?new=true` or click `New Slideshow`. Storyboard or create surface appears (`aria-label="Slideshow storyboard"` and/or add-slide controls when a draft is active).
- **Proof.** Screenshot `$PROOF_DIR/slideshow/studio.png`.

## Gotchas

- Remote image hosts and Ollama failures must remain visible; do not fake generated slides.
- Draft titles in lists use open controls like `Open <title>` — match the accessible name from the snapshot.
