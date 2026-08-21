import sharp from "sharp";

const MAX_REMOTE_IMAGE_BYTES = 25 * 1024 * 1024;
const DEFAULT_REMOTE_IMAGE_HOSTS = [
  "images.unsplash.com",
  "i.pinimg.com",
  "v3.fal.media",
];

export type SlideshowRenderGrid = "none" | "1:2" | "1:3" | "2:1" | "2:2";

export type SlideshowRenderBackgroundSlide = {
  imageUrl?: string | null;
  imageUrls?: string[];
  imageBuffer?: Buffer | null;
  imageBuffers?: Array<Buffer | null>;
  visualKey?: string;
  visualKeys?: string[];
  grid?: SlideshowRenderGrid;
};

const palettes: Record<string, [string, string, string]> = {
  "coral-glow": ["#ff9a76", "#d44b60", "#472044"],
  "blue-studio": ["#4f9fd9", "#245e8d", "#111d45"],
  "night-grid": ["#8f6cbd", "#3b315d", "#171727"],
  "lime-paper": ["#e3ee8b", "#8faf58", "#39584a"],
  "violet-dusk": ["#b57bc0", "#59406f", "#181b38"],
  "mint-room": ["#a9e0c4", "#4c9c8d", "#244f62"],
  "paper-stack": ["#e1c29e", "#9e705d", "#4d3240"],
  "sunset-blocks": ["#ffbf72", "#ed6b66", "#71385d"],
  "coral-wave": ["#ff8b68", "#bf4260", "#3a254d"],
};

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function paletteFor(key: string) {
  if (palettes[key]) return palettes[key];
  const value = hash(key || "postforge");
  const hue = value % 360;
  return [
    `hsl(${hue} 72% 70%)`,
    `hsl(${(hue + 28) % 360} 52% 43%)`,
    `hsl(${(hue + 62) % 360} 42% 17%)`,
  ] as [string, string, string];
}

export function gridMarkup(
  grid: SlideshowRenderBackgroundSlide["grid"],
  width: number,
  height: number,
) {
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111" stroke-width="8"/>`;
  if (grid === "1:2") return line(width / 2, 0, width / 2, height);
  if (grid === "2:1") return line(0, height / 2, width, height / 2);
  if (grid === "1:3") {
    return `${line(width / 3, 0, width / 3, height)}${line((width * 2) / 3, 0, (width * 2) / 3, height)}`;
  }
  if (grid === "2:2") {
    return `${line(width / 2, 0, width / 2, height)}${line(0, height / 2, width, height / 2)}`;
  }
  return "";
}

type GridCell = { left: number; top: number; width: number; height: number };

function cellsForGrid(
  grid: SlideshowRenderBackgroundSlide["grid"],
  width: number,
  height: number,
): GridCell[] {
  const columns = grid === "1:2" ? 2 : grid === "1:3" ? 3 : grid === "2:2" ? 2 : 1;
  const rows = grid === "2:1" || grid === "2:2" ? 2 : 1;
  const cells: GridCell[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const left = Math.round((column * width) / columns);
      const right = Math.round(((column + 1) * width) / columns);
      const top = Math.round((row * height) / rows);
      const bottom = Math.round(((row + 1) * height) / rows);
      cells.push({ left, top, width: right - left, height: bottom - top });
    }
  }
  return cells;
}

function backgroundSvg(width: number, height: number, visualKey = "coral-glow") {
  const [start, middle, end] = paletteFor(visualKey);
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${start}"/>
          <stop offset="0.52" stop-color="${middle}"/>
          <stop offset="1" stop-color="${end}"/>
        </linearGradient>
        <radialGradient id="glow" cx="76%" cy="18%" r="48%">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".48"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#base)"/>
      <rect width="100%" height="100%" fill="url(#glow)"/>
      <circle cx="${width * 0.12}" cy="${height * 0.84}" r="${Math.min(width, height) * 0.3}" fill="#111" opacity=".14"/>
    </svg>
  `);
}

function allowedRemoteImageHost(hostname: string) {
  const configured = (process.env.SLIDESHOW_REMOTE_IMAGE_HOSTS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return [...DEFAULT_REMOTE_IMAGE_HOSTS, ...configured].some((entry) =>
    entry.startsWith("*.")
      ? hostname.endsWith(entry.slice(1)) && hostname !== entry.slice(2)
      : hostname === entry,
  );
}

export function isSlideshowRemoteImageUrlAllowed(value: string) {
  try {
    const parsed = new URL(value);
    return Boolean(
      parsed.protocol === "https:" &&
        !parsed.username &&
        !parsed.password &&
        (!parsed.port || parsed.port === "443") &&
        allowedRemoteImageHost(parsed.hostname.toLowerCase()),
    );
  } catch {
    return false;
  }
}

async function readLimitedImageBody(response: Response) {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_REMOTE_IMAGE_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

async function remoteBackground(url: string, width: number, height: number) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!isSlideshowRemoteImageUrlAllowed(parsed.href)) {
    return null;
  }

  const response = await fetch(parsed, {
    signal: AbortSignal.timeout(12_000),
    redirect: "error",
    headers: { Accept: "image/avif,image/webp,image/png,image/jpeg" },
  });
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("image/")) return null;
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_REMOTE_IMAGE_BYTES) return null;
  const data = await readLimitedImageBody(response);
  if (!data) return null;
  return sharp(data, { limitInputPixels: 50_000_000, sequentialRead: true })
    .rotate()
    .resize(width, height, { fit: "cover" })
    .png()
    .toBuffer();
}

async function backgroundForCell(options: {
  imageBuffer?: Buffer | null;
  imageUrl?: string | null;
  visualKey: string;
  width: number;
  height: number;
}) {
  if (options.imageBuffer?.length) {
    try {
      return await sharp(options.imageBuffer, {
        limitInputPixels: 50_000_000,
        sequentialRead: true,
      })
        .rotate()
        .resize(options.width, options.height, { fit: "cover" })
        .png()
        .toBuffer();
    } catch {
      // Fall through to the URL or generated visual.
    }
  }
  if (options.imageUrl) {
    try {
      const remote = await remoteBackground(
        options.imageUrl,
        options.width,
        options.height,
      );
      if (remote) return remote;
    } catch {
      // Fall through to a deterministic visual when remote media is unavailable.
    }
  }
  return sharp(backgroundSvg(options.width, options.height, options.visualKey))
    .png()
    .toBuffer();
}

export async function buildSlideBackground(
  slide: SlideshowRenderBackgroundSlide,
  width: number,
  height: number,
) {
  const cells = cellsForGrid(slide.grid, width, height);
  const imageBuffers = slide.imageBuffers?.length
    ? slide.imageBuffers
    : [slide.imageBuffer ?? null];
  const imageUrls = slide.imageUrls?.length
    ? slide.imageUrls
    : [slide.imageUrl ?? null];
  const visualKeys = slide.visualKeys?.length
    ? slide.visualKeys
    : [slide.visualKey ?? "coral-glow"];
  const layers = await Promise.all(
    cells.map(async (cell, index) => ({
      input: await backgroundForCell({
        imageBuffer: imageBuffers[index],
        imageUrl: imageUrls[index],
        visualKey:
          visualKeys[index] ??
          visualKeys[index % visualKeys.length] ??
          `postforge-grid-${index}`,
        width: cell.width,
        height: cell.height,
      }),
      left: cell.left,
      top: cell.top,
    })),
  );

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 17, g: 17, b: 17, alpha: 1 },
    },
  })
    .composite(layers)
    .png()
    .toBuffer();
}
