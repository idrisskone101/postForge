"use client";

import { useEffect, useState } from "react";
import { AvatarPicker } from "@/components/avatar-picker";
import { ReferencePickerPopover } from "@/components/collection-reference-picker-popover";
import { apiGet } from "@/lib/api/client";
import type { AvatarListPage } from "@/lib/avatar-picker-model";
import { ReferenceField } from "./form-reference-field";
import type { GenerateIdentityActions, GenerateIdentityView } from "./form-types";

export function GenerateIdentitySection({
  view,
  actions,
}: {
  view: GenerateIdentityView;
  actions: GenerateIdentityActions;
}) {
  const { show, avatarId, identityStatus, identityError } = view;
  const { onSelect } = actions;
  const name = useAvatarName(avatarId);
  if (!show) return undefined;

  return (
    <ReferenceField label="Character identity" onClear={avatarId ? () => onSelect("") : undefined}>
      <ReferencePickerPopover
        label="Character identity"
        wide
        summary={
          avatarId
            ? {
                text: name ?? "Character chosen",
                thumb: (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/avatars/${encodeURIComponent(avatarId)}`} alt="" />
                ),
              }
            : { text: "No character chosen", placeholder: true }
        }
      >
        {(close) => (
          <AvatarPicker
            selectedId={avatarId}
            onSelect={(id) => {
              onSelect(id);
              if (id) close();
            }}
          />
        )}
      </ReferencePickerPopover>
      {avatarId && identityStatus.tone === "ready" ? (
        <p role="status" className="wb-meta">
          {identityStatus.label}
        </p>
      ) : avatarId ? (
        <p
          role={identityStatus.tone === "failed" ? "alert" : "status"}
          className="wb-notice wb-fade-in"
          data-tone={identityStatus.tone === "failed" ? "bad" : undefined}
        >
          {identityStatus.label}
        </p>
      ) : null}
      {identityError ? (
        <p role="alert" className="wb-notice wb-fade-in" data-tone="bad">
          {identityError}
        </p>
      ) : null}
    </ReferenceField>
  );
}

function useAvatarName(avatarId: string | null) {
  const [names, setNames] = useState<Record<string, string>>({});
  const known = avatarId ? names[avatarId] : undefined;
  useEffect(() => {
    if (!avatarId || known) return;
    let active = true;
    apiGet<AvatarListPage>("/api/avatars")
      .then((page) => {
        if (!active) return;
        setNames(Object.fromEntries(page.items.map((avatar) => [avatar.id, avatar.name])));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [avatarId, known]);
  return known ?? null;
}
