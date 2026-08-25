import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AUTOMATION_TEMPLATES } from "../../src/lib/automations";
import {
  filterPlaybooks,
  playbookCategories,
  playbookCategoryCounts,
} from "../../src/app/(app)/automations/new/playbook-model";

const recommended = filterPlaybooks({
  search: "",
  category: "All",
  sort: "recommended",
  favoriteTemplateIds: [],
});
assert.deepEqual(
  recommended.map((template) => template.id),
  AUTOMATION_TEMPLATES.map((template) => template.id),
  "recommended sort keeps catalog order"
);

const favorites = filterPlaybooks({
  search: "",
  category: "Favorites",
  sort: "recommended",
  favoriteTemplateIds: ["before-after", "custom"],
});
assert.deepEqual(
  favorites.map((template) => template.id),
  ["before-after", "custom"]
);

const education = filterPlaybooks({
  search: "",
  category: "Education",
  sort: "recommended",
  favoriteTemplateIds: [],
});
assert.deepEqual(
  education.map((template) => template.id),
  ["story-lesson", "myth-reality"]
);

const searched = filterPlaybooks({
  search: "quick wins",
  category: "All",
  sort: "recommended",
  favoriteTemplateIds: [],
});
assert.deepEqual(
  searched.map((template) => template.id),
  ["quick-wins"]
);

const byName = filterPlaybooks({
  search: "",
  category: "All",
  sort: "name",
  favoriteTemplateIds: [],
});
assert.deepEqual(
  byName.map((template) => template.name),
  [...AUTOMATION_TEMPLATES.map((template) => template.name)].sort((first, second) =>
    first.localeCompare(second)
  )
);

const bySlides = filterPlaybooks({
  search: "",
  category: "All",
  sort: "slides",
  favoriteTemplateIds: [],
});
for (let index = 1; index < bySlides.length; index += 1) {
  const previous = bySlides[index - 1];
  const current = bySlides[index];
  assert.ok(
    previous.slides < current.slides ||
      (previous.slides === current.slides &&
        previous.name.localeCompare(current.name) <= 0),
    "slides sort is ascending, then name"
  );
}

assert.deepEqual(playbookCategories(), [
  "All",
  "Favorites",
  "Education",
  "Transformation",
  "Product",
  "Listicle",
  "Blank",
]);
assert.equal(playbookCategoryCounts(["custom"]).Favorites, 1);
assert.equal(playbookCategoryCounts(["custom"]).All, AUTOMATION_TEMPLATES.length);

const pickerSource = readFileSync(
  new URL("../../src/app/(app)/automations/new/playbook-picker.tsx", import.meta.url),
  "utf8"
);
assert.match(pickerSource, /picker: PlaybookPickerState/);
assert.match(pickerSource, /Build from scratch/);
assert.doesNotMatch(pickerSource, /createContext/);

console.log("playbook picker tests passed");
