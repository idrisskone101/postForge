import assert from "node:assert/strict";
import { getAvatarOptionLabel } from "../src/components/avatar-picker";

assert.equal(getAvatarOptionLabel(0), "Identity 1");
assert.equal(getAvatarOptionLabel(4), "Identity 5");
assert.doesNotMatch(getAvatarOptionLabel(0), /[0-9a-f]{8}-[0-9a-f-]{27}/i);
