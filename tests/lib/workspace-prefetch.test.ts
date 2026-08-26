import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkWorkspacePrefetch,
  findUndocumentedPrefetchOff,
  formatPrefetchViolations,
  PRIMARY_NAV_FILES,
} from "../../scripts/check-workspace-prefetch";

const undocumented = `export function Nav() {
  return <Link href="/" prefetch={false}>Home</Link>;
}
`;
assert.deepEqual(findUndocumentedPrefetchOff("src/components/sidebar.tsx", undocumented), [
  { path: "src/components/sidebar.tsx", line: 2 },
]);

const documented = `export function Nav() {
  return (
    <Link prefetch={false} href="/settings?tab=billing">
      {/* prefetch-off: billing is a footer utility */}
      Manage
    </Link>
  );
}
`;
assert.deepEqual(
  findUndocumentedPrefetchOff("src/components/sidebar.tsx", documented),
  []
);

const enabled = `export function Nav() {
  return <Link href="/">Home</Link>;
}
`;
assert.deepEqual(findUndocumentedPrefetchOff("src/components/sidebar.tsx", enabled), []);

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const repoViolations = checkWorkspacePrefetch({ rootDir: repoRoot });
assert.deepEqual(repoViolations, []);
assert.equal(PRIMARY_NAV_FILES.length, 2);
assert.match(
  formatPrefetchViolations([{ path: "src/components/sidebar.tsx", line: 120 }]),
  /prefetch-off:/
);
