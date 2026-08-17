import assert from "node:assert/strict";
import { inflateRawSync } from "node:zlib";

import sharp from "sharp";

import {
  canRenderSlideshowVideo,
  createSlideshowTextOverlaySvg,
  createZipArchive,
  getSlideshowDimensions,
  isSlideshowRemoteImageUrlAllowed,
  renderSlideshowArchive,
  renderSlideshowSlide,
  renderSlideshowVideo,
} from "../src/lib/ai/slideshow-renderer";
import {
  SLIDESHOW_TEXT_REFERENCE_WIDTH,
  slideshowHeadlineFontSize,
} from "../src/lib/slideshow/text-overlay";

function headlineFontSizes(svg: string) {
  return [...svg.matchAll(/font-size="([\d.]+)" font-weight="800"/g)].map((match) =>
    Number(match[1]),
  );
}

function readZipEntry(archive: Buffer, target: string) {
  let offset = 0;
  while (archive.readUInt32LE(offset) === 0x04034b50) {
    const compressedSize = archive.readUInt32LE(offset + 18);
    const filenameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = archive.subarray(nameStart, nameStart + filenameLength).toString("utf8");
    const dataStart = nameStart + filenameLength + extraLength;
    if (name === target) {
      return inflateRawSync(archive.subarray(dataStart, dataStart + compressedSize));
    }
    offset = dataStart + compressedSize;
  }
  throw new Error(`ZIP entry not found: ${target}`);
}

async function main() {
  const supportsVideo = await canRenderSlideshowVideo();
  const slide = {
    id: "slide-1",
    eyebrow: "A practical test",
    headline: "The reminder habit that finally felt calm",
    body: "Make one useful action easy enough to repeat tomorrow.",
    visualKey: "coral-glow",
    overlayEnabled: true,
    overlayOpacity: 38,
    displayText: true,
    grid: "none" as const,
  };

  const image = await renderSlideshowSlide(slide, {
    aspectRatio: "4:5",
    format: "jpeg",
    textSettings: { style: "outline", align: "center", position: "center" },
  });
  assert.deepEqual([...image.subarray(0, 3)], [0xff, 0xd8, 0xff]);
  const metadata = await sharp(image).metadata();
  assert.equal(metadata.width, 1080);
  assert.equal(metadata.height, 1350);
  assert.equal(metadata.format, "jpeg");

  const shadowSvg = createSlideshowTextOverlaySvg(slide, 1080, 1920, {
    style: "plain",
    font: "SerifItalic",
    padding: "flush",
  }).toString("utf8");
  assert.match(shadowSvg, /id="slideshow-text-shadow-slide-1"/);
  assert.match(shadowSvg, /url\(#slideshow-text-shadow-slide-1\)/);
  assert.match(shadowSvg, /viewBox="0 0 1080 1920"/);
  assert.match(shadowSvg, /data-slideshow-text-overlay="true"/);
  assert.match(shadowSvg, /<feGaussianBlur/);
  assert.match(shadowSvg, /text-rendering="geometricPrecision"/);
  assert.match(shadowSvg, /font-style="italic"/);

  const sizedExport = createSlideshowTextOverlaySvg(slide, 1080, 1920, {
    style: "plain",
    size: 56,
  }).toString("utf8");
  const sizedPreview = createSlideshowTextOverlaySvg(slide, 282, 501, {
    style: "plain",
    size: 56,
  }).toString("utf8");
  const exportHeadline = headlineFontSizes(sizedExport)[0];
  const previewHeadline = headlineFontSizes(sizedPreview)[0];
  assert.equal(exportHeadline, slideshowHeadlineFontSize(56, 1080));
  assert.equal(previewHeadline, 56);
  assert.ok(
    Math.abs(exportHeadline - 56 * (1080 / SLIDESHOW_TEXT_REFERENCE_WIDTH)) < 0.001,
  );
  assert.equal(
    (sizedExport.match(/font-weight="800"/g) ?? []).length,
    (sizedPreview.match(/font-weight="800"/g) ?? []).length,
  );

  const neighborSvg = createSlideshowTextOverlaySvg(
    { ...slide, id: "slide-2" },
    1080,
    1920,
    { style: "plain" },
  ).toString("utf8");
  assert.match(neighborSvg, /id="slideshow-text-shadow-slide-2"/);
  assert.doesNotMatch(neighborSvg, /id="slideshow-text-shadow-slide-1"/);

  const lightBackgroundSvg = createSlideshowTextOverlaySvg(slide, 1080, 1920, {
    style: "light",
    align: "center",
  }).toString("utf8");
  assert.match(lightBackgroundSvg, /fill="#ffffff" opacity="0.96"/);
  assert.match(lightBackgroundSvg, /fill="#111111"/);

  const wrappedBackgroundSvg = createSlideshowTextOverlaySvg(
    {
      ...slide,
      eyebrow: "",
      headline: "A longer headline tiny",
      body: "",
    },
    1080,
    1920,
    {
      style: "light",
      align: "center",
      width: 50,
      backgroundRadius: 12,
    },
  ).toString("utf8");
  const wrappedLineBoxes = [
    ...wrappedBackgroundSvg.matchAll(
      /data-line-box="true" data-y="([\d.]+)" data-height="([\d.]+)" data-width="([\d.]+)" data-radius="([\d.]+)" data-top-radius="([\d.]+)" data-bottom-radius="([\d.]+)"/g,
    ),
  ].map((match) => ({
    y: Number(match[1]),
    height: Number(match[2]),
    width: Number(match[3]),
    radius: Number(match[4]),
    topRadius: Number(match[5]),
    bottomRadius: Number(match[6]),
  }));
  const wrappedLineWidths = wrappedLineBoxes.map((box) => box.width);
  assert.ok(wrappedLineWidths.length >= 2);
  assert.ok(new Set(wrappedLineWidths.map(Math.round)).size >= 2);
  assert.ok(wrappedLineBoxes.length >= 2);
  assert.ok(
    Math.abs(
      wrappedLineBoxes[0].y +
        wrappedLineBoxes[0].height -
        wrappedLineBoxes[1].y,
    ) < 0.01,
  );
  assert.ok(wrappedLineBoxes.every((box) => box.radius > 0));
  assert.equal(wrappedLineBoxes[0].topRadius, wrappedLineBoxes[0].radius);
  assert.equal(wrappedLineBoxes[0].bottomRadius, 0);
  assert.equal(wrappedLineBoxes.at(-1)?.topRadius, 0);
  assert.equal(
    wrappedLineBoxes.at(-1)?.bottomRadius,
    wrappedLineBoxes.at(-1)?.radius,
  );
  assert.ok(
    wrappedLineBoxes.slice(1, -1).every(
      (box) => box.topRadius === 0 && box.bottomRadius === 0,
    ),
  );

  const backgroundImage = await renderSlideshowSlide(slide, {
    aspectRatio: "9:16",
    format: "png",
    textSettings: { style: "solid", font: "Condensed" },
  });
  const lightBackgroundImage = await renderSlideshowSlide(slide, {
    aspectRatio: "9:16",
    format: "png",
    textSettings: { style: "light", font: "Editorial" },
  });
  assert.notDeepEqual(backgroundImage, lightBackgroundImage);

  const gridImage = await renderSlideshowSlide(
    {
      ...slide,
      grid: "2:2",
      displayText: false,
      overlayEnabled: false,
      visualKeys: ["coral-glow", "blue-studio", "lime-paper", "violet-dusk"],
    },
    { aspectRatio: "1:1", format: "png" },
  );
  const { data: gridPixels, info: gridInfo } = await sharp(gridImage)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixelAt = (x: number, y: number) => {
    const offset = (y * gridInfo.width + x) * gridInfo.channels;
    return [...gridPixels.subarray(offset, offset + 3)];
  };
  assert.notDeepEqual(pixelAt(270, 270), pixelAt(810, 270));
  assert.notDeepEqual(pixelAt(270, 810), pixelAt(810, 810));

  assert.deepEqual(getSlideshowDimensions("16:9"), {
    width: 1920,
    height: 1080,
  });
  assert.equal(
    isSlideshowRemoteImageUrlAllowed("https://images.unsplash.com/photo.jpg"),
    true,
  );
  assert.equal(
    isSlideshowRemoteImageUrlAllowed("http://images.unsplash.com/photo.jpg"),
    false,
  );
  assert.equal(
    isSlideshowRemoteImageUrlAllowed("https://127.0.0.1/private.png"),
    false,
  );
  assert.equal(
    isSlideshowRemoteImageUrlAllowed("https://example.com/untrusted.png"),
    false,
  );

  const archive = await renderSlideshowArchive({
    id: "project-1",
    title: "Calm reminders",
    caption: "Save this calm reminder for later.",
    aspectRatio: "1:1",
    textSettings: { font: "Serif" },
    slides: [slide, { ...slide, id: "slide-2", headline: "Keep it repeatable" }],
  });
  assert.equal(archive.readUInt32LE(0), 0x04034b50);
  assert.match(archive.toString("latin1"), /slide-01\.jpg/);
  assert.match(archive.toString("latin1"), /slide-02\.jpg/);
  assert.match(archive.toString("latin1"), /manifest\.json/);
  assert.match(archive.toString("latin1"), /caption\.txt/);
  assert.equal(
    readZipEntry(archive, "caption.txt").toString("utf8"),
    "Save this calm reminder for later.\n",
  );

  if (supportsVideo) {
    const video = await renderSlideshowVideo(
      {
        id: "project-video",
        title: "Calm reminders video",
        aspectRatio: "1:1",
        slides: [slide],
      },
      { secondsPerSlide: 0.5 },
    );
    assert.equal(video.subarray(4, 8).toString("ascii"), "ftyp");
    assert.ok(video.length > 10_000);
  }

  const emptyArchive = createZipArchive([]);
  assert.equal(emptyArchive.readUInt32LE(0), 0x06054b50);
}

main()
  .then(() => console.log("slideshow renderer tests passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
