/**
 * Demo workspace switch.
 *
 * A demo build is a separate deployment with its own database that holds only
 * sample content. The flag is a NEXT_PUBLIC variable on purpose: Next inlines
 * it at build time, so the shell, the middleware, and the server can never
 * disagree about which kind of build is running.
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_POSTFORGE_DEMO_MODE === "1";
}

/** Response header set on every request the demo request policy refuses. */
export const DEMO_BLOCKED_HEADER = "x-postforge-demo";

export const DEMO_BLOCKED_MESSAGE =
  "This is the PostForge demo workspace. Generation, uploads, and external connections are turned off here.";

export const DEMO_RATE_LIMITED_MESSAGE =
  "The demo workspace is receiving a lot of edits right now. Try again in a minute.";

export const DEMO_WORKSPACE_NAME = "Loamly";

/** Minutes between automatic restores of the sample workspace. */
export function demoResetIntervalMinutes(): number {
  const parsed = Number.parseInt(
    process.env.POSTFORGE_DEMO_RESET_MINUTES ?? "",
    10
  );
  return Number.isInteger(parsed) && parsed >= 5 && parsed <= 24 * 60
    ? parsed
    : 60;
}
