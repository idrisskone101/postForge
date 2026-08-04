export async function register() {
  // Keep Node-only workers and database clients out of the Edge instrumentation
  // graph. Next replaces NEXT_RUNTIME at compile time and can eliminate this
  // branch for Edge bundles when the positive equality form is used.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrapServerRuntime } = await import("@/lib/runtime-bootstrap");
    await bootstrapServerRuntime();
  }
}
