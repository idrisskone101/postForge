import { apiGet } from "@/lib/api/client";
import type { AvatarListPage } from "@/lib/avatar-picker-model";

/**
 * The saved identities as this tab last saw them. The identity picker opens in a popover that is
 * placed around its content, so it must open at its loaded size: a picker that starts on a short
 * skeleton and then fills in moves the whole surface a frame after it appears.
 */
let remembered: AvatarListPage | null = null;

export function rememberedAvatars(): AvatarListPage | null {
  return remembered;
}

export function rememberAvatars(page: AvatarListPage) {
  remembered = page;
}

export async function loadAvatars(): Promise<AvatarListPage> {
  const page = await apiGet<AvatarListPage>("/api/avatars");
  remembered = page;
  return page;
}
