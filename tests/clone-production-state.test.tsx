import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CloneProductionStatePanel,
  getClonePrimaryAction,
} from "../src/components/ugc-clone-form";

const emptyState = renderToStaticMarkup(
  <CloneProductionStatePanel
    sourceReady={false}
    trimReady={false}
    identityReady={false}
    referenceReady={false}
    canGenerate={false}
    nextAction={getClonePrimaryAction({
      sourceReady: false,
      identityReady: false,
      referenceReady: false,
      canGenerate: false,
      usesSavedReference: false,
    })}
  />
);

assert.match(emptyState, /Production State/);
assert.match(emptyState, /Source/);
assert.match(emptyState, /Trim/);
assert.match(emptyState, /Identity/);
assert.match(emptyState, /Reference/);
assert.match(emptyState, /Generate readiness/);
assert.match(emptyState, /Add source to continue/);

assert.equal(
  getClonePrimaryAction({
    sourceReady: true,
    identityReady: false,
    referenceReady: false,
    canGenerate: false,
    usesSavedReference: false,
  }).label,
  "Select identity"
);

assert.equal(
  getClonePrimaryAction({
    sourceReady: true,
    identityReady: true,
    referenceReady: true,
    canGenerate: true,
    usesSavedReference: true,
  }).label,
  "Generate clone"
);
