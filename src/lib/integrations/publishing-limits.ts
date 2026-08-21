import { isWellFormedUnicode, unicodeCodePointLength } from "../unicode";
import {
  IntegrationMediaValidationError,
  MAX_SOCIAL_PUBLISH_MEDIA_BYTES,
  type ShortPublishMedia,
} from "./publishing-types";

export function exactCaption(
  value: string,
  maximum: number,
  provider: string,
  length: (candidate: string) => number = unicodeCodePointLength
) {
  if (!isWellFormedUnicode(value)) {
    throw new IntegrationMediaValidationError(
      `${provider} caption contains invalid Unicode`
    );
  }
  if (length(value) > maximum) {
    throw new IntegrationMediaValidationError(
      `${provider} caption must be ${maximum} characters or fewer`
    );
  }
  return value;
}

function positiveMediaNumber(value: number | null, label: string) {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    throw new IntegrationMediaValidationError(
      `Approved video ${label} is missing; regenerate the asset before publishing`
    );
  }
  return value;
}

export function assertSocialPublishMediaSizeBytes(size: number) {
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new IntegrationMediaValidationError(
      "Approved video has no stored media data"
    );
  }
  if (size > MAX_SOCIAL_PUBLISH_MEDIA_BYTES) {
    throw new IntegrationMediaValidationError(
      "PostForge social publishing currently supports generated videos up to 128 MB"
    );
  }
  return size;
}

export function validateCommonMedia(media: ShortPublishMedia) {
  assertSocialPublishMediaSizeBytes(media.bytes.length);
  if (!media.mimeType.startsWith("video/")) {
    throw new IntegrationMediaValidationError(
      "Only an approved generated video can be published"
    );
  }
  return {
    width: positiveMediaNumber(media.width, "width"),
    height: positiveMediaNumber(media.height, "height"),
    duration: positiveMediaNumber(media.durationSec, "duration"),
  };
}
