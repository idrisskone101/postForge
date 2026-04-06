export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { bootstrapServerRuntime } = await import("@/lib/runtime-bootstrap");
  await bootstrapServerRuntime();
}
