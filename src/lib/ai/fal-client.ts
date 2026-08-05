import { fal } from "@fal-ai/client";
import * as fs from "fs/promises";
import * as path from "path";
import { getProviderCredential } from "@/lib/providers/credentials";

let falConfigured = false;
let falConfiguration: Promise<void> | null = null;

async function ensureFalConfigured(): Promise<void> {
  if (falConfigured) return;
  if (!falConfiguration) {
    falConfiguration = (async () => {
      const storedKey = await getProviderCredential("fal");
      const credentials = storedKey ?? process.env.FAL_KEY;
      if (credentials?.trim()) {
        fal.config({ credentials: credentials.trim() });
        falConfigured = true;
      }
    })();
  }
  await falConfiguration;
}

export async function subscribeToGeneration(
  endpoint: string,
  input: Record<string, unknown>
) {
  await ensureFalConfigured();
  return fal.subscribe(endpoint, { input, logs: true });
}

export async function submitToQueue(
  endpoint: string,
  input: Record<string, unknown>
) {
  await ensureFalConfigured();
  return fal.queue.submit(endpoint, { input });
}

export async function checkQueueStatus(
  endpoint: string,
  requestId: string
) {
  await ensureFalConfigured();
  return fal.queue.status(endpoint, { requestId, logs: true });
}

export async function getQueueResult(
  endpoint: string,
  requestId: string
) {
  await ensureFalConfigured();
  return fal.queue.result(endpoint, { requestId });
}

export async function uploadToFalStorage(filePath: string): Promise<string> {
  await ensureFalConfigured();
  const buffer = await fs.readFile(filePath);
  const file = new File([buffer], path.basename(filePath));
  return fal.storage.upload(file);
}
