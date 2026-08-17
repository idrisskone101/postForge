import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import PrivacyPage from "../src/app/privacy/page";
import TermsPage from "../src/app/terms/page";
import DataDeletionPage from "../src/app/data-deletion/page";
import { isPublicPolicyPath } from "../src/lib/public-policy-routes";

const privacy = renderToStaticMarkup(<PrivacyPage />);
const terms = renderToStaticMarkup(<TermsPage />);
const deletion = renderToStaticMarkup(<DataDeletionPage />);

for (const pathname of ["/privacy", "/terms", "/data-deletion"]) {
  assert.equal(isPublicPolicyPath(pathname), true);
}
assert.equal(isPublicPolicyPath("/settings"), false);

for (const markup of [privacy, terms, deletion]) {
  assert.match(markup, /data-public-policy/);
  assert.match(markup, /Effective/);
  assert.match(markup, /August 9, 2026/);
  assert.match(markup, /href="\/privacy"/);
  assert.match(markup, /href="\/terms"/);
  assert.match(markup, /href="\/data-deletion"/);
  assert.match(markup, /href="mailto:idriss\.kone@icloud\.com"/);
  assert.match(markup, /aria-current="page"/);
  assert.doesNotMatch(markup, /stored-access-secret|stored-refresh-secret/i);
}

assert.match(privacy, /encrypts provider tokens at rest/i);
assert.match(privacy, /does not sell personal data/i);
assert.match(privacy, /30 days old/i);
assert.match(terms, /explicit approval/i);
assert.match(terms, /provider.*required permission/i);
assert.match(deletion, /Settings.*Integrations/);
assert.match(deletion, /provider confirms/i);
assert.match(deletion, /YouTube automation bindings.*cleared automatically/i);
assert.match(deletion, /TikTok and Instagram automation settings.*may retain/i);
assert.match(deletion, /cannot be used for new publishing/i);
