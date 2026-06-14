const HOME_ACTIVE_JOB_WINDOW_MS = 24 * 60 * 60 * 1000;

export type HomeActiveJobCandidate = {
  status: string;
  createdAt: Date;
  startedAt?: Date | null;
  lockExpiresAt?: Date | null;
};

export function getHomeActiveJobCutoff(now = new Date()): Date {
  return new Date(now.getTime() - HOME_ACTIVE_JOB_WINDOW_MS);
}

export function isHomeActiveJob(
  job: HomeActiveJobCandidate,
  now = new Date()
): boolean {
  if (job.status !== "queued" && job.status !== "processing") return false;

  const cutoff = getHomeActiveJobCutoff(now);
  return (
    job.createdAt >= cutoff ||
    (job.startedAt !== null && job.startedAt !== undefined && job.startedAt >= cutoff) ||
    (job.lockExpiresAt !== null &&
      job.lockExpiresAt !== undefined &&
      job.lockExpiresAt >= now)
  );
}
