/**
 * Programmatic file download using fetch + blob URL.
 * More reliable than <a download> across browsers.
 */
export async function downloadFile(
  url: string,
  filename?: string
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  // Extract filename from Content-Disposition header if not provided
  if (!filename) {
    const disposition = response.headers.get("content-disposition");
    if (disposition) {
      const match = disposition.match(/filename="?([^";\n]+)"?/);
      if (match) filename = match[1];
    }
    filename = filename || "download";
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }, 100);
}
