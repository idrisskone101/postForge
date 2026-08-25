import { AUTOMATION_TEMPLATES } from "@/lib/automations/templates";

export type Phase = "Hook" | "Content" | "CTA";
export type TemplateSort = "recommended" | "name" | "slides";
export type TemplateView = "grid" | "list";
export type AutomationTemplate = (typeof AUTOMATION_TEMPLATES)[number];

export type PlaybookPickerState = {
  templates: readonly AutomationTemplate[];
  categories: readonly string[];
  categoryCounts: Record<string, number>;
  category: string;
  onCategoryChange: (category: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  sort: TemplateSort;
  onSortChange: (sort: TemplateSort) => void;
  view: TemplateView;
  onViewChange: (view: TemplateView) => void;
  favorites: readonly string[];
  onToggleFavorite: (templateId: string) => void;
  previewTemplate: AutomationTemplate;
  onPreview: (templateId: string) => void;
  selectedTemplateId: string;
  onSelect: (templateId: string) => void;
  onBuildFromScratch: () => void;
  onClose: () => void;
};

export const PHASES: Phase[] = ["Hook", "Content", "CTA"];
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const FAVORITES_STORAGE_KEY = "postforge.automation-playbook-favorites";

export const TEMPLATE_VISUALS: Record<string, string> = {
  "story-lesson": "bg-[linear-gradient(145deg,#FFC2AD,#FF5B33)]",
  "before-after": "bg-[linear-gradient(145deg,#C6DFFF,#4B86CB)]",
  "product-breakdown": "bg-[linear-gradient(145deg,#C7EAD5,#3D8960)]",
  "quick-wins": "bg-[linear-gradient(145deg,#E0D3FF,#8B67C7)]",
  "myth-reality": "bg-[linear-gradient(145deg,#F5E3AE,#CC9C37)]",
  custom: "bg-[#E5E6DF]",
};

export function isTemplateSort(value: string): value is TemplateSort {
  return value === "recommended" || value === "name" || value === "slides";
}

export function templateNumber(template: AutomationTemplate) {
  if (template.id === "custom") return "+";
  const index = AUTOMATION_TEMPLATES.findIndex((candidate) => candidate.id === template.id);
  return `0${index + 1}`;
}

export function playbookCategories() {
  return [
    "All",
    "Favorites",
    ...Array.from(new Set(AUTOMATION_TEMPLATES.map((template) => template.category))),
  ];
}

export function playbookCategoryCounts(favoriteTemplateIds: readonly string[]) {
  const counts: Record<string, number> = {
    All: AUTOMATION_TEMPLATES.length,
    Favorites: favoriteTemplateIds.length,
  };
  for (const template of AUTOMATION_TEMPLATES) {
    counts[template.category] = (counts[template.category] ?? 0) + 1;
  }
  return counts;
}

export function filterPlaybooks({
  search,
  category,
  sort,
  favoriteTemplateIds,
}: {
  search: string;
  category: string;
  sort: TemplateSort;
  favoriteTemplateIds: readonly string[];
}) {
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = AUTOMATION_TEMPLATES.filter((template) => {
    const categoryMatches =
      category === "All" ||
      (category === "Favorites"
        ? favoriteTemplateIds.includes(template.id)
        : template.category === category);
    const searchMatches = `${template.name} ${template.category} ${template.description} ${template.hook} ${template.structure}`
      .toLowerCase()
      .includes(normalizedSearch);
    return categoryMatches && searchMatches;
  });

  return [...filtered].sort((first, second) => {
    if (sort === "name") return first.name.localeCompare(second.name);
    if (sort === "slides") {
      return first.slides - second.slides || first.name.localeCompare(second.name);
    }
    return (
      AUTOMATION_TEMPLATES.findIndex((template) => template.id === first.id) -
      AUTOMATION_TEMPLATES.findIndex((template) => template.id === second.id)
    );
  });
}
