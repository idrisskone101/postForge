export class SlideshowApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SlideshowApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
export function badRequest(message: string, code = "invalid_request"): never {
  throw new SlideshowApiError(400, code, message);
}

export function notFound(resource: string): never {
  throw new SlideshowApiError(
    404,
    "not_found",
    `${resource} not found`
  );
}

export function revisionConflict(currentRevision: number): never {
  throw new SlideshowApiError(
    409,
    "revision_conflict",
    "This record changed since it was loaded. Refresh it and try again.",
    { currentRevision }
  );
}
