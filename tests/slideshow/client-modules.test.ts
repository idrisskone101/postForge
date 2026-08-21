import assert from "node:assert/strict";

import {
  createSlideshowAutomation,
  deleteSlideshowAutomation,
  downloadSlideshowExport,
  fetchSlideshowAutomations,
  requestSlideshowCopyVariation,
  requestSlideshowImageGeneration,
  requestSlideshowStory,
  updateSlideshowAutomation,
  updateSlideshowAutomationStatus,
} from "../../src/lib/slideshow/client";
import {
  createSlideshowAutomation as createAutomationFromModule,
  deleteSlideshowAutomation as deleteAutomationFromModule,
  fetchSlideshowAutomations as fetchAutomationsFromModule,
  updateSlideshowAutomation as updateAutomationFromModule,
  updateSlideshowAutomationStatus as updateAutomationStatusFromModule,
} from "../../src/lib/slideshow/client-automations";
import { downloadSlideshowExport as downloadExportFromModule } from "../../src/lib/slideshow/client-export";
import { requestSlideshowImageGeneration as requestImageFromModule } from "../../src/lib/slideshow/client-images";
import {
  requestSlideshowCopyVariation as requestCopyFromModule,
  requestSlideshowStory as requestStoryFromModule,
} from "../../src/lib/slideshow/client-story";

assert.equal(requestSlideshowStory, requestStoryFromModule);
assert.equal(requestSlideshowCopyVariation, requestCopyFromModule);
assert.equal(requestSlideshowImageGeneration, requestImageFromModule);
assert.equal(downloadSlideshowExport, downloadExportFromModule);
assert.equal(fetchSlideshowAutomations, fetchAutomationsFromModule);
assert.equal(createSlideshowAutomation, createAutomationFromModule);
assert.equal(updateSlideshowAutomation, updateAutomationFromModule);
assert.equal(deleteSlideshowAutomation, deleteAutomationFromModule);
assert.equal(updateSlideshowAutomationStatus, updateAutomationStatusFromModule);

console.log("slideshow client module split tests passed");
