import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import {
  INSPIRATION_VIDEO_PAGE_SIZE,
  inspirationVideoFeedPath,
  type InspirationVideoPage,
  type InspirationVideoPageQuery,
  type SetInspirationRejectionResult,
  type TrackedInspirationAccount,
  type UseInspirationResult,
} from "@/lib/inspiration/types";

export function fetchInspirationVideoPage(input: InspirationVideoPageQuery) {
  return apiGet<InspirationVideoPage>(
    inspirationVideoFeedPath({
      ...input,
      take: input.take ?? INSPIRATION_VIDEO_PAGE_SIZE,
    })
  );
}

export function trackInspirationAccount(handle: string) {
  return apiPost<TrackedInspirationAccount>("/api/ugc-inspiration/accounts", {
    handle,
  });
}

export function refreshInspirationAccount(accountId: string) {
  return apiPost<TrackedInspirationAccount>(
    `/api/ugc-inspiration/accounts/${accountId}/refresh`,
    {}
  );
}

export function deleteInspirationAccount(accountId: string) {
  return apiDelete(`/api/ugc-inspiration/accounts/${accountId}`);
}

export function postInspirationVideoUse(videoId: string) {
  return apiPost<UseInspirationResult>(
    `/api/ugc-inspiration/videos/${videoId}/use`,
    {}
  );
}

export function setInspirationVideoRejection(
  videoId: string,
  rejected: boolean
) {
  return apiPost<SetInspirationRejectionResult>(
    `/api/ugc-inspiration/videos/${videoId}/rejection`,
    { rejected }
  );
}

export async function copyInspirationSourceUrl(url: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = url;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}
