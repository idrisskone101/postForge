import * as fs from "fs/promises";

export async function fileExists(fullPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(fullPath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

export async function unlinkIfExists(fullPath: string): Promise<void> {
  try {
    await fs.unlink(fullPath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }
}

export function validateReadRange(start: number, end: number) {
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end < start
  ) {
    throw new RangeError("Invalid storage byte range");
  }
}

export async function readFileRange(
  fullPath: string,
  start: number,
  end: number
): Promise<Buffer> {
  validateReadRange(start, end);
  const handle = await fs.open(fullPath, "r");
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || start >= stat.size) {
      throw new RangeError("Storage byte range is outside the file");
    }
    const length = Math.min(end, stat.size - 1) - start + 1;
    const data = Buffer.allocUnsafe(length);
    let offset = 0;
    while (offset < length) {
      const read = await handle.read(data, offset, length - offset, start + offset);
      if (read.bytesRead === 0) break;
      offset += read.bytesRead;
    }
    if (offset !== length) {
      throw new Error("Stored file changed while it was being read");
    }
    return data;
  } finally {
    await handle.close();
  }
}

export async function storedFileSize(fullPath: string): Promise<number> {
  const stat = await fs.stat(fullPath);
  if (!stat.isFile()) {
    const err = new Error(`File not found: ${fullPath}`) as NodeJS.ErrnoException;
    err.code = "ENOENT";
    throw err;
  }
  return stat.size;
}
