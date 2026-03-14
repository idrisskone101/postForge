import { fal } from "@fal-ai/client";
import * as fs from "fs/promises";
import * as path from "path";

fal.config({ credentials: process.env.FAL_KEY });

export async function subscribeToGeneration(
  endpoint: string,
  input: Record<string, unknown>
) {
  return fal.subscribe(endpoint, { input, logs: true });
}

export async function submitToQueue(
  endpoint: string,
  input: Record<string, unknown>
) {
  return fal.queue.submit(endpoint, { input });
}

export async function checkQueueStatus(
  endpoint: string,
  requestId: string
) {
  return fal.queue.status(endpoint, { requestId, logs: true });
}

export async function getQueueResult(
  endpoint: string,
  requestId: string
) {
  return fal.queue.result(endpoint, { requestId });
}

export async function uploadToFalStorage(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const file = new File([buffer], path.basename(filePath));
  return fal.storage.upload(file);
}
