import assert from "node:assert/strict";
import { inflateRawSync } from "node:zlib";

import { NextRequest } from "next/server";
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
} from "../../src/lib/ai/slideshow-renderer";
import { SlideshowApiError } from "../../src/lib/slideshow/errors";
import { parseSlideshowOverlayRequest } from "../../src/lib/slideshow/overlay-request";
import {
  SLIDESHOW_TEXT_REFERENCE_WIDTH,
  slideshowHeadlineFontSize,
} from "../../src/lib/slideshow/text-overlay";
import { createSlideshowTextOverlayMarkup } from "../../src/lib/slideshow/text-overlay-satori";
import { POST as overlayPost } from "../../src/app/api/slideshows/overlay/route";

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

async function overlayInk(svg: string) {
  const { data, info } = await sharp(Buffer.from(svg))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;
  let count = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha > 12) {
        count += 1;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return {
    count,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
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

  const shadowSvg = (
    await createSlideshowTextOverlaySvg(slide, 1080, 1920, {
      style: "plain",
      font: "SerifItalic",
      padding: "flush",
    })
  ).toString("utf8");
  assert.match(shadowSvg, /viewBox="0 0 1080 1920"/);
  assert.match(shadowSvg, /data-slideshow-text-overlay="true"/);
  assert.match(shadowSvg, /<path /);
  const uprightSerif = (
    await createSlideshowTextOverlaySvg(slide, 1080, 1920, {
      style: "plain",
      font: "Serif",
      padding: "flush",
    })
  ).toString("utf8");
  assert.notEqual(shadowSvg, uprightSerif);

  const sizedExport = (
    await createSlideshowTextOverlaySvg(slide, 1080, 1920, {
      style: "plain",
      size: 56,
    })
  ).toString("utf8");
  const sizedPreview = await createSlideshowTextOverlayMarkup(slide, 1080, 1920, {
    style: "plain",
    size: 56,
  });
  assert.equal(sizedExport, sizedPreview);
  assert.match(sizedExport, /width="1080"/);
  assert.match(sizedExport, /height="1920"/);
  assert.match(sizedPreview, /viewBox="0 0 1080 1920"/);
  assert.equal(
    slideshowHeadlineFontSize(56, 1080),
    56 * (1080 / SLIDESHOW_TEXT_REFERENCE_WIDTH),
  );

  const compactSvg = await createSlideshowTextOverlayMarkup(slide, 1080, 1920, {
    style: "plain",
    size: 28,
  });
  const compactInk = await overlayInk(compactSvg);
  const largeInk = await overlayInk(sizedExport);
  assert.ok(compactInk.count > 0);
  assert.ok(largeInk.height > compactInk.height * 1.35);

  const neighborSvg = (
    await createSlideshowTextOverlaySvg(
      { ...slide, id: "slide-2", headline: "Keep it repeatable" },
      1080,
      1920,
      { style: "plain" },
    )
  ).toString("utf8");
  assert.match(neighborSvg, /data-slideshow-text-overlay="true"/);
  assert.notEqual(neighborSvg, shadowSvg);

  const lightBackgroundSvg = (
    await createSlideshowTextOverlaySvg(slide, 1080, 1920, {
      style: "light",
      align: "center",
    })
  ).toString("utf8");
  assert.match(lightBackgroundSvg, /#ffffff|#fff|rgb\(255,\s*255,\s*255\)/i);
  assert.match(lightBackgroundSvg, /#111111|#111|rgb\(17,\s*17,\s*17\)/i);

  const wrappedBackgroundSvg = (
    await createSlideshowTextOverlaySvg(
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
    )
  ).toString("utf8");
  const wrappedWidths = [
    ...wrappedBackgroundSvg.matchAll(/\bwidth="([\d.]+)"/g),
  ]
    .map((match) => Number(match[1]))
    .filter((value) => value > 40 && value < 1080);
  assert.ok(wrappedWidths.length >= 2);
  assert.ok(new Set(wrappedWidths.map((value) => Math.round(value))).size >= 2);

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

  const parsed = parseSlideshowOverlayRequest({
    slide: { headline: "Hello overlay" },
    width: 1080,
    height: 1920,
    settings: { style: "plain", size: 28 },
  });
  assert.equal(parsed.slide.headline, "Hello overlay");
  assert.equal(parsed.settings.size, 28);
  try {
    parseSlideshowOverlayRequest({
      slide: { headline: "Hello overlay" },
      width: 12,
      height: 12,
    });
    assert.fail("expected invalid canvas size to throw");
  } catch (error) {
    assert.equal(error instanceof SlideshowApiError, true);
  }

  const overlayResponse = await overlayPost(
    new NextRequest("http://localhost/api/slideshows/overlay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slide: { headline: "Hello overlay" },
        width: 1080,
        height: 1920,
        settings: { style: "plain", size: 28 },
      }),
    }),
  );
  assert.equal(overlayResponse.status, 200);
  assert.match(
    overlayResponse.headers.get("content-type") ?? "",
    /image\/svg\+xml/,
  );
  const overlayBody = await overlayResponse.text();
  assert.match(overlayBody, /data-slideshow-text-overlay="true"/);
  assert.match(overlayBody, /viewBox="0 0 1080 1920"/);

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
