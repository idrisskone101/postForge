export type DurableFalSubmitOutcome =
  | "unclaimed"
  | "submitted"
  | "submission-unknown"
  | "failed"
  | "error";

export type DurableFalSubmitDependencies = {
  claim: () => Promise<boolean>;
  submit: () => Promise<{ request_id: string }>;
  persistRequestId: (requestId: string) => Promise<boolean>;
  onRejectedBeforeAccept?: (error: Error) => Promise<DurableFalSubmitOutcome>;
  onAmbiguous: (error: Error) => Promise<DurableFalSubmitOutcome>;
  onStarted?: () => void;
};

export async function submitDurableFalRequest(
  dependencies: DurableFalSubmitDependencies,
): Promise<DurableFalSubmitOutcome> {
  const claimed = await dependencies.claim();
  if (!claimed) return "unclaimed";

  let providerAccepted = false;
  try {
    const queued = await dependencies.submit();
    const requestId = queued.request_id?.trim();
    if (!requestId) {
      throw new Error("The generation provider did not return a request id");
    }
    providerAccepted = true;
    const persisted = await dependencies.persistRequestId(requestId);
    if (!persisted) {
      return dependencies.onAmbiguous(
        new Error(
          "Generation submission was accepted but its request id could not be persisted",
        ),
      );
    }
    dependencies.onStarted?.();
    return "submitted";
  } catch (error) {
    const failure =
      error instanceof Error
        ? error
        : new Error("Generation submission failed");
    if (!providerAccepted && dependencies.onRejectedBeforeAccept) {
      return dependencies.onRejectedBeforeAccept(failure);
    }
    return dependencies.onAmbiguous(failure);
  }
}
