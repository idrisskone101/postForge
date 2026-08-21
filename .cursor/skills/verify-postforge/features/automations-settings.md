# Automations and Settings

Automations holds content-plan drafts; Settings controls workspace configuration. Together they prove local draft/settings surfaces without requiring connected social publishing.

## Sub-features

- `automations-hub` opens the automations list.
- `automations-new` opens the builder (`/automations/new`, optional `?workflow=slideshow`).
- `settings-panel` opens Settings and switches tabs via query or tab controls.
- `settings-integrations` deep-links to Integrations without inventing connections.

## How to get to it (user POV)

- Choose `Automations` or `Settings` in workspace navigation.
- Open `/automations`, `/automations/new`, `/automations/new?workflow=slideshow`.
- Open `/settings` or `/settings?tab=integrations` (also `models`, `api-keys`, `billing`, …).

## Driving it with control-postforge

Preconditions:

- Doctor is green.
- Provider OAuth secrets may be absent; Integrations must show disconnected/unavailable honestly.

- **Automations hub.** Run `control-postforge browser goto /automations`. Empty CTA may read `Create a content plan` or offer `New slideshow automation`.
- **New automation.** Run `control-postforge browser goto /automations/new`. Expect `aria-label="Automation name"` and/or `aria-label="Back to automations"` and playbook search when present (`aria-label="Search playbooks"`).
- **Slideshow workflow entry.** Run `control-postforge browser goto /automations/new?workflow=slideshow`. Builder reflects slideshow workflow without publishing.
- **Settings panel.** Run `control-postforge browser goto /settings`. Locate `section[aria-label="Settings panel"]` (or equivalent) and tab controls such as Profile, Available models, Integrations.
- **Integrations tab.** Run `control-postforge browser goto /settings?tab=integrations`. Connected providers are real only after OAuth; missing credentials stay explicit.
- **Proof.** Snapshots under `$PROOF_DIR/automations/` and `$PROOF_DIR/settings/`; screenshots of hub and integrations tab.

## Gotchas

- Publishing destinations without provider scopes must remain unavailable.
- Do not write tokens into localStorage, URLs, or proof logs.
- Tab labels use `aria-current="page"` when selected — assert that rather than URL alone when both matter.
