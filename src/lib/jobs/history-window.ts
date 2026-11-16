/** How far back finished jobs count: the Jobs page list, its stats and the sidebar failure badge share it. */
export const JOBS_HISTORY_DAYS = 30;

export function jobsHistoryCutoff(now: Date = new Date()) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - JOBS_HISTORY_DAYS);
  return cutoff;
}
