import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { deflateRawSync } from "node:zlib";

import sharp from "sharp";

import { createSlideshowTextOverlaySvg } from "@/lib/slideshow/text-overlay-satori";
import {
  getSlideshowDimensions,
  type SlideshowRenderTextSettings,
  type SlideshowTextOverlaySlide,
} from "@/lib/slideshow/text-overlay";
import {
  buildSlideBackground,
  gridMarkup,
  type SlideshowRenderBackgroundSlide,
} from "./slideshow-render-background";

const execFileAsync = promisify(execFile);

export type SlideshowRenderFormat = "jpeg" | "png" | "webp";
export type { SlideshowRenderTextSettings };
export { getSlideshowDimensions, createSlideshowTextOverlaySvg };
export { isSlideshowRemoteImageUrlAllowed } from "./slideshow-render-background";

export type SlideshowRenderSlide = SlideshowTextOverlaySlide &
  SlideshowRenderBackgroundSlide & {
  overlayEnabled?: boolean;
  overlayOpacity?: number;
  displayText?: boolean;
};

export type SlideshowRenderProject = {
  id: string;
  title: string;
  caption?: string;
  aspectRatio: string;
  slides: SlideshowRenderSlide[];
  textSettings?: SlideshowRenderTextSettings;
};

export async function renderSlideshowSlide(
  slide: SlideshowRenderSlide,
  options: {
    aspectRatio?: string;
    textSettings?: SlideshowRenderTextSettings;
    format?: SlideshowRenderFormat;
    quality?: number;
  } = {},
) {
  const { width, height } = getSlideshowDimensions(options.aspectRatio ?? "9:16");
  const background = await buildSlideBackground(slide, width, height);

  const overlayOpacity = slide.overlayEnabled === false
    ? 0
    : Math.max(0, Math.min(100, slide.overlayOpacity ?? 36)) / 100;
  const layers: sharp.OverlayOptions[] = [
    {
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#000" opacity="${overlayOpacity}"/>${gridMarkup(slide.grid, width, height)}</svg>`,
      ),
    },
  ];
  if (slide.displayText !== false) {
    layers.push({
      input: await createSlideshowTextOverlaySvg(
        slide,
        width,
        height,
        options.textSettings ?? {},
      ),
    });
  }

  const renderer = sharp(background).composite(layers);
  const format = options.format ?? "jpeg";
  if (format === "png") return renderer.png({ compressionLevel: 9 }).toBuffer();
  if (format === "webp") return renderer.webp({ quality: options.quality ?? 92 }).toBuffer();
  return renderer.jpeg({ quality: options.quality ?? 92, chromaSubsampling: "4:4:4" }).toBuffer();
}

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let index = 0; index < 8; index += 1) {
    crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipEntry(name: string, data: Buffer, offset: number) {
  const filename = Buffer.from(name, "utf8");
  const compressed = deflateRawSync(data, { level: 6 });
  const checksum = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x0800, 6);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(checksum, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(filename.length, 26);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(checksum, 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(filename.length, 28);
  central.writeUInt32LE(offset, 42);

  return {
    local: Buffer.concat([local, filename, compressed]),
    central: Buffer.concat([central, filename]),
  };
}

export function createZipArchive(files: Array<{ name: string; data: Buffer }>) {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const entry = zipEntry(file.name, file.data, offset);
    locals.push(entry.local);
    centrals.push(entry.central);
    offset += entry.local.length;
  }
  const centralSize = centrals.reduce((total, value) => total + value.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

export async function renderSlideshowArchive(
  project: SlideshowRenderProject,
  format: SlideshowRenderFormat = "jpeg",
  caption = project.caption ?? "",
) {
  if (!project.slides.length) throw new Error("A slideshow needs at least one slide to export.");
  if (project.slides.length > 20) throw new Error("A slideshow export is limited to 20 slides.");
  const extension = format === "jpeg" ? "jpg" : format;
  const files: Array<{ name: string; data: Buffer }> = [];
  for (const [index, slide] of project.slides.entries()) {
    files.push({
      name: `slide-${String(index + 1).padStart(2, "0")}.${extension}`,
      data: await renderSlideshowSlide(slide, {
        aspectRatio: project.aspectRatio,
        textSettings: project.textSettings,
        format,
      }),
    });
  }
  const normalizedCaption = caption.trim();
  if (normalizedCaption) {
    files.push({
      name: "caption.txt",
      data: Buffer.from(`${normalizedCaption}\n`, "utf8"),
    });
  }
  files.push({
    name: "manifest.json",
    data: Buffer.from(
      JSON.stringify(
        {
          schemaVersion: 1,
          projectId: project.id,
          title: project.title,
          aspectRatio: project.aspectRatio,
          format,
          slideCount: project.slides.length,
          files: files.map((file) => file.name),
          captionFile: normalizedCaption ? "caption.txt" : null,
        },
        null,
        2,
      ),
    ),
  });
  return createZipArchive(files);
}

function concatFilePath(path: string) {
  return path.replaceAll("'", "'\\''");
}

export async function renderSlideshowVideo(
  project: SlideshowRenderProject,
  options: { secondsPerSlide?: number; ffmpegPath?: string } = {},
) {
  if (!project.slides.length) throw new Error("A slideshow needs at least one slide to export.");
  if (project.slides.length > 20) throw new Error("A slideshow video is limited to 20 slides.");

  const secondsPerSlide = Math.max(0.5, Math.min(10, options.secondsPerSlide ?? 2.5));
  const directory = await mkdtemp(join(tmpdir(), "postforge-slideshow-"));
  const outputPath = join(directory, "slideshow.mp4");

  try {
    const paths: string[] = [];
    for (const [index, slide] of project.slides.entries()) {
      const path = join(directory, `slide-${String(index + 1).padStart(2, "0")}.jpg`);
      const image = await renderSlideshowSlide(slide, {
        aspectRatio: project.aspectRatio,
        textSettings: project.textSettings,
        format: "jpeg",
      });
      await writeFile(path, image);
      paths.push(path);
    }

    const concatPath = join(directory, "slides.txt");
    const concat = paths
      .flatMap((path) => [
        `file '${concatFilePath(path)}'`,
        `duration ${secondsPerSlide}`,
      ])
      .concat(`file '${concatFilePath(paths.at(-1) as string)}'`)
      .join("\n");
    await writeFile(concatPath, concat);

    await execFileAsync(
      options.ffmpegPath ?? process.env.FFMPEG_PATH ?? "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concatPath,
        "-vf",
        "fps=30,format=yuv420p",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "18",
        "-movflags",
        "+faststart",
        outputPath,
      ],
      { timeout: 120_000 },
    );

    return await readFile(outputPath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function canRenderSlideshowVideo(
  ffmpegPath = process.env.FFMPEG_PATH ?? "ffmpeg",
) {
  try {
    await execFileAsync(ffmpegPath, ["-version"], { timeout: 3_000 });
    return true;
  } catch {
    return false;
  }
}

