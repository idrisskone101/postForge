# Characters

Characters lets a user browse the character library and open the character builder to name and save a character without external generation keys.

## Sub-features

- `characters-library` opens the library from nav or deep link.
- `characters-empty` shows the empty library CTA when no characters exist.
- `characters-new` opens the builder from the header or empty CTA.
- `characters-save` persists a name and returns a library row (or detail) that can be reopened.

## How to get to it (user POV)

- Choose `Characters` in workspace navigation.
- Open `/characters` or `/characters/new`.
- Choose the header CTA `New Character` when present.
- From an empty library, choose `New character`.

## Driving it with control-postforge

Preconditions:

- Doctor is green.
- Prefer a unique name such as `Verify Character $RUN_ID` so shared DB runs do not collide.
- No requirement for fal.ai.

- **Open library.** Run `control-postforge browser goto /characters`. The heading is `Characters` (or equivalent library title) and navigation marks Characters current.
- **Empty or list.** Snapshot the shell. Run `control-postforge browser snapshot --aria --path "$PROOF_DIR/characters/library.aria.txt"`. Empty copy or a search field `Search characters` are both valid.
- **Open builder.** Run `control-postforge browser goto /characters/new` or click the link/button named `New Character` / `New character`. A builder heading and `aria-label="Character name"` appear.
- **Name character.** Run `control-postforge browser fill --role textbox --name "Character name" --value "Verify Character $RUN_ID"` (use the accessible name from the snapshot if it differs slightly).
- **Save.** Click the control named `Save character`. Wait until a success state or return navigation appears (library link or saved name visible).
- **Confirm persistence.** Run `control-postforge browser goto /characters` and snapshot again. The library shows `Verify Character $RUN_ID` or an actions control `Actions for Verify Character $RUN_ID`.
- **Proof.** Screenshot `$PROOF_DIR/characters/library-after.png` showing the saved character.

## Gotchas

- Avatar generation / import may stay gated without fal; saving identity fields must still work.
- Search filters can hide the new row — clear search before asserting absence.
- Clean up the fixture character after proof if the UI exposes delete; keep proof files.
