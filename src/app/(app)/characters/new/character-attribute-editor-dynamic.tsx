"use client";

import dynamic from "next/dynamic";

export const CharacterAttributeEditorDynamic = dynamic(
  () =>
    import("./character-attribute-editor").then((mod) => ({
      default: mod.CharacterAttributeEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        data-character-attribute-editor="true"
        className="min-h-[470px] min-w-0 bg-white min-[1280px]:row-start-2 min-[1280px]:h-full min-[1280px]:min-h-0"
        aria-hidden="true"
      />
    ),
  },
);
