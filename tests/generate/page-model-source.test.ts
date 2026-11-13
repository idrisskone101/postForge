import { STORED_ENABLED_MODEL_IDS, storeReads } from "../_env/stored-model-availability";
import assert from "node:assert/strict";
import { getAvailableModels, getAvailableModelsNow } from "../../src/lib/ai/model-availability";
import { getAllModels } from "../../src/lib/ai/models";

async function testColdCacheReturnsTheEnabledSet() {
  assert.equal(STORED_ENABLED_MODEL_IDS.length, 2);
  assert.ok(getAllModels().length > 2, "the registry must hold more than the enabled set");

  assert.equal(
    getAvailableModelsNow().length,
    getAllModels().length,
    "the synchronous read offers the whole registry while the cache is cold"
  );
  assert.deepEqual(storeReads, []);

  const models = await getAvailableModels();
  assert.deepEqual(
    models.map((model) => model.id),
    STORED_ENABLED_MODEL_IDS,
    "the Generate page source returns only the stored enabled models on a cold cache"
  );
  assert.deepEqual(storeReads, ["workspace-features/models.json"]);
}

testColdCacheReturnsTheEnabledSet()
  .then(() => console.log("generate page model source tests passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
