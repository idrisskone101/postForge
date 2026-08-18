# ADR-0001: Two Automation domains

## Status

Accepted

## Context

PostForge uses the word “automation” for two products:

- **Workspace Automation** — a review-draft loop stored as workspace-feature JSON, with an optional Connection destination. Publishing is approval-gated and never implied by a schedule tick.
- **Slideshow Automation** — a Prisma-backed generator that ticks Slideshow Projects. It does not publish to a Connection.

They have separate schedule implementations and incompatible weekday models. An architecture review will be tempted to merge them because they share a name and appear on `/automations`.

## Decision

Keep two modules. Do not unify storage, scheduling, or publishing. Say **Workspace Automation** or **Slideshow Automation** in domain language. A shared timezone/HH:mm kernel is allowed later only if both schedulers call it; that kernel is not a merge of the domains.

## Consequences

Future architecture reviews should not propose collapsing these into one Automation module. The `/automations` route may list both, but it must not merge their types.
