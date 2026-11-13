/** The monthly production budget lives only in this browser. Spend and Home read the same key. */
export const PRODUCTION_BUDGET_STORAGE_KEY = "postforge-production-budget";
export const DEFAULT_PRODUCTION_BUDGET = 250;

export function parseStoredBudget(stored: string | null) {
  const parsed = stored ? Number(stored) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
