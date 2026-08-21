export class AutomationPublicationClaimError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AutomationPublicationClaimError";
    this.statusCode = statusCode;
  }
}
