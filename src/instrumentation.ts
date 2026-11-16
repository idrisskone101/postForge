export async function register() {
  // Keep Node-only workers and database clients out of the Edge instrumentation
  // graph. Next replaces NEXT_RUNTIME at compile time and can eliminate this
  // branch for Edge bundles when the positive equality form is used.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrapServerRuntime } = await import("@/lib/runtime-bootstrap");
    try {
      await bootstrapServerRuntime();
    } catch (error) {
      if (process.env.NEXT_PUBLIC_POSTFORGE_DEMO_MODE !== "1") throw error;
      // Fail closed: a demo build that could not restore its sample workspace
      // must not start serving whatever the database happens to hold.
      console.error("[demo] could not prepare the demo workspace", error);
      process.exit(1);
    }
  }
}
