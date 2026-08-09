export interface PromptImprovementRequestToken {
  id: number;
  inputVersion: number;
}

export interface PromptImprovementRequestGate {
  begin: () => PromptImprovementRequestToken | null;
  finish: (token: PromptImprovementRequestToken) => void;
  invalidateInputs: () => void;
  isCurrent: (token: PromptImprovementRequestToken) => boolean;
}

export function createPromptImprovementRequestGate(): PromptImprovementRequestGate {
  let activeRequestId: number | null = null;
  let nextRequestId = 0;
  let inputVersion = 0;

  return {
    begin() {
      if (activeRequestId !== null) return null;
      activeRequestId = ++nextRequestId;
      return { id: activeRequestId, inputVersion };
    },
    finish(token) {
      if (activeRequestId === token.id) activeRequestId = null;
    },
    invalidateInputs() {
      inputVersion += 1;
    },
    isCurrent(token) {
      return activeRequestId === token.id && inputVersion === token.inputVersion;
    },
  };
}

export interface PromptImprovementUndoState {
  promptBeforeImprovement: string | null;
  promptImprovementNotice: string | null;
}

export function invalidatePromptImprovementUndo(): PromptImprovementUndoState {
  return {
    promptBeforeImprovement: null,
    promptImprovementNotice: null,
  };
}

export function restorePromptImprovementUndo(
  state: PromptImprovementUndoState
): { prompt: string; state: PromptImprovementUndoState } | null {
  if (state.promptBeforeImprovement === null) return null;
  return {
    prompt: state.promptBeforeImprovement,
    state: {
      promptBeforeImprovement: null,
      promptImprovementNotice: "Original prompt restored.",
    },
  };
}

export function canRunPromptImprovement(input: {
  hasModel: boolean;
  hasPrompt: boolean;
  isRunning: boolean;
  configured: boolean | null;
}) {
  return (
    input.hasModel &&
    input.hasPrompt &&
    !input.isRunning &&
    input.configured !== false
  );
}
