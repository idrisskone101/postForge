import { getModelsByType } from "../../src/lib/ai/models";
import type { CloneActionModel } from "../../src/components/clone/view-models";
import { CloneActionBar } from "../../src/components/clone/action-bar";
import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";

const cloneVideoModels = getModelsByType("video").slice(0, 1);
const referenceImageModels = getModelsByType("image").slice(0, 1);
const videoModel = cloneVideoModels[0];
const imageModel = referenceImageModels[0];
if (!videoModel || !imageModel) {
  throw new Error("expected registered image and video models");
}

const action: CloneActionModel = {
  cloneTip: { title: "Tip", body: "Keep the hook." },
  mobileSettingsOpen: true,
  cloneVideoModels: [videoModel],
  referenceImageModels: [imageModel],
  selectedModel: videoModel.id,
  selectedReferenceImageModel: imageModel.id,
  keepOriginalSound: true,
  removeTextOverlays: false,
  durationSec: 8,
  referenceBatchSize: 1,
  textErasureCost: 0.02,
  totalRefCost: 0.04,
  referenceBatchCost: 0.04,
  videoCost: 0.8,
  isSubmitting: false,
  isGenerating: false,
  compactActionLabel: "Generate clone",
  primaryActionDisabled: false,
  onToggleMobileSettings: () => {},
  onCloseMobileSettings: () => {},
  onSelectModel: () => {},
  onSelectReferenceImageModel: () => {},
  onToggleSound: () => {},
  onToggleTextOverlays: () => {},
  onPrimaryAction: () => {},
};

const markup = renderToStaticMarkup(<CloneActionBar action={action} />);

assert.match(markup, /aria-label="Keep original sound"/);
assert.match(markup, /aria-label="Remove on-screen text"/);
assert.match(markup, /data-clone-primary-action-bar="true"/);
