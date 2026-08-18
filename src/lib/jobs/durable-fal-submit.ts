export type DurableFalSubmitOutcome =
  | "unclaimed"
  | "submitted"
  | "submission-unknown"
  | "failed"
  | "error";

export type DurableFalSubmitResult = {
  outcome: DurableFalSubmitOutcome;
  claimed: boolean;
  submitted: boolean;
  persisted: boolean;
};

export type DurableFalSubmitDependencies = {
  claim: () => Promise<boolean>;
  submit: () => Promise<{ request_id: string }>;
  persistRequestId: (requestId: string) => Promise<boolean>;
  onRejectedBeforeAccept?: (error: Error) => Promise<DurableFalSubmitOutcome>;
  onAmbiguous: (error: Error) => Promise<DurableFalSubmitOutcome>;
  onStarted?: () => void;
};

export async function submitAcceptedFalRequest(
  dependencies: Omit<DurableFalSubmitDependencies, "claim">,
): Promise<DurableFalSubmitResult> {
  let submitted = false;
  let persisted = false;
  let providerAccepted = false;
  try {
    const queued = await dependencies.submit();
    const requestId = queued.request_id?.trim();
    if (!requestId) {
      throw new Error("The generation provider did not return a request id");
    }
    providerAccepted = true;
    submitted = true;
    persisted = await dependencies.persistRequestId(requestId);
    if (!persisted) {
      return {
        outcome: await dependencies.onAmbiguous(
          new Error(
            "Generation submission was accepted but its request id could not be persisted",
          ),
        ),
        claimed: true,
        submitted: true,
        persisted: false,
      };
    }
    dependencies.onStarted?.();
    return {
      outcome: "submitted",
      claimed: true,
      submitted: true,
      persisted: true,
    };
  } catch (error) {
    const failure =
      error instanceof Error
        ? error
        : new Error("Generation submission failed");
    if (!providerAccepted && dependencies.onRejectedBeforeAccept) {
      return {
        outcome: await dependencies.onRejectedBeforeAccept(failure),
        claimed: true,
        submitted: false,
        persisted: false,
      };
    }
    return {
      outcome: await dependencies.onAmbiguous(failure),
      claimed: true,
      submitted,
      persisted,
    };
  }
}

export async function submitDurableFalRequest(
  dependencies: DurableFalSubmitDependencies,
): Promise<DurableFalSubmitResult> {
  const claimed = await dependencies.claim();
  if (!claimed) {
    return {
      outcome: "unclaimed",
      claimed: false,
      submitted: false,
      persisted: false,
    };
  }
  return submitAcceptedFalRequest(dependencies);
}
