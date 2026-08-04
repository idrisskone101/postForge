type FeatureRecord = { id: string };

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = response.statusText || "Request failed";
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      message = body.error ?? body.message ?? message;
    } catch {
      // Keep the status text when the response is not JSON.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function fetchWorkspaceFeature<T extends FeatureRecord>(feature: string) {
  const response = await fetch(`/api/workspace-features/${feature}`, {
    cache: "no-store",
  });
  return parseResponse<{ records: T[] }>(response);
}

export async function saveWorkspaceFeature<T extends FeatureRecord>(
  feature: string,
  record: T
) {
  const response = await fetch(`/api/workspace-features/${feature}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record }),
  });
  return parseResponse<{ records: T[] }>(response);
}

export async function removeWorkspaceFeature<T extends FeatureRecord>(
  feature: string,
  id: string
) {
  const response = await fetch(
    `/api/workspace-features/${feature}?id=${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
  return parseResponse<{ records: T[] }>(response);
}
