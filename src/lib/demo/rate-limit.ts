/**
 * Write and heavy-render budget for the open demo workspace.
 *
 * Anyone can reach the demo without signing in, so the number of edits (and
 * of CPU-heavy renders) is capped per visitor and overall. Together with the
 * body size cap this bounds how much a visitor can add between restores.
 * Counters live in memory, which is right for the single small instance a
 * demo runs on; a restart simply starts a fresh window.
 */
export type DemoRateLimitOptions = {
  windowMs: number;
  perClient: number;
  overall: number;
};

export const DEMO_RATE_LIMIT: DemoRateLimitOptions = {
  windowMs: 60_000,
  perClient: 30,
  overall: 120,
};

const MAX_TRACKED_CLIENTS = 5_000;

export function createDemoRateLimiter(options: DemoRateLimitOptions = DEMO_RATE_LIMIT) {
  let windowStart = 0;
  let total = 0;
  const clients = new Map<string, number>();

  return {
    /** Records one metered request. Returns false when it is over budget. */
    take(client: string, now = Date.now()): boolean {
      if (now - windowStart >= options.windowMs) {
        windowStart = now;
        total = 0;
        clients.clear();
      }
      const used = clients.get(client) ?? 0;
      if (total >= options.overall || used >= options.perClient) return false;
      // A flood of distinct addresses must not grow the map without bound;
      // once it is full, unseen clients share one bucket for the window.
      const key = clients.has(client) || clients.size < MAX_TRACKED_CLIENTS ? client : "*";
      clients.set(key, (clients.get(key) ?? 0) + 1);
      total += 1;
      return true;
    },
  };
}
