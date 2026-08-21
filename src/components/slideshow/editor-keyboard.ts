import {
  isEditableKeyboardTarget,
  type SlideshowViewMode,
} from "./slideshow-view";

export function handleEditorKeyDown(
  event: KeyboardEvent,
  input: {
    viewMode: SlideshowViewMode;
    onExitPlay: () => void;
    onStep: (delta: -1 | 1, wrap: boolean) => void;
  },
) {
  if (isEditableKeyboardTarget(event.target)) return;
  const { viewMode, onExitPlay, onStep } = input;
  if (event.key === "Escape" && viewMode === "play") {
    event.preventDefault();
    onExitPlay();
    return;
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    onStep(event.key === "ArrowLeft" ? -1 : 1, viewMode === "play");
  }
}
