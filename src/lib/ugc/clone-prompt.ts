const DEFAULT_CLONE_PROMPT_WITH_REF =
  "Person performing the actions from the reference video, consistent appearance";
const DEFAULT_CLONE_PROMPT_V3 =
  "@Element1 in the scene, natural environment lighting, consistent background, seamless scene continuity";
const DEFAULT_CLONE_PROMPT_V2 =
  "Person in the scene, natural environment lighting, consistent background, seamless scene continuity";
const MOTION_CAMERA_LOCK_PROMPT =
  "Use the motion video as the authority for the opening pose, body position, scale, crop, camera height, camera distance, perspective, and timing. Use the supplied reference image for the avatar identity, clothing, lighting, and scene appearance, but do not let it reposition the person or change the starting camera geometry. If the reference image and motion video disagree about the starting pose or framing, follow the motion video's first frame. Keep a natural front-facing phone-camera feel. Avoid visible phones, tripod-like professional angles, and extra hands.";

export function buildFinalClonePrompt(params: {
  prompt?: string;
  hasRefImage: boolean;
  isV3: boolean;
}): string {
  const userPrompt = params.prompt?.trim();

  if (userPrompt) {
    const promptWithCameraLock = `${userPrompt} ${MOTION_CAMERA_LOCK_PROMPT}`;
    return params.isV3 && !promptWithCameraLock.includes("@Element1")
      ? `@Element1 ${promptWithCameraLock}`
      : params.isV3
        ? promptWithCameraLock
        : promptWithCameraLock.replace(/@Element1\s*/g, "");
  }

  if (params.hasRefImage) {
    return params.isV3
      ? `@Element1 ${DEFAULT_CLONE_PROMPT_WITH_REF}. ${MOTION_CAMERA_LOCK_PROMPT}`
      : `${DEFAULT_CLONE_PROMPT_WITH_REF}. ${MOTION_CAMERA_LOCK_PROMPT}`;
  }

  return params.isV3
    ? `${DEFAULT_CLONE_PROMPT_V3}. ${MOTION_CAMERA_LOCK_PROMPT}`
    : `${DEFAULT_CLONE_PROMPT_V2}. ${MOTION_CAMERA_LOCK_PROMPT}`;
}
