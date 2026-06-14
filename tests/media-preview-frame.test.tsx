import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MediaPreviewFrame } from "../src/components/media-preview";

const detailMarkup = renderToStaticMarkup(
  <MediaPreviewFrame
    type="video"
    src="/portrait.mp4"
    width={1080}
    height={1920}
    alt="Portrait source"
    variant="detail"
    showMetadata
    actions={<button type="button">Download</button>}
  />
);

assert.match(detailMarkup, /data-media-preview-frame="detail"/);
assert.match(detailMarkup, /object-contain/);
assert.match(detailMarkup, /h-\[min\(640px,calc\(100dvh-14rem\)\)\]/);
assert.match(detailMarkup, /max-h-\[calc\(100dvh-12rem\)\]/);
assert.match(detailMarkup, /9:16/);
assert.match(detailMarkup, /1080 x 1920/);
assert.match(detailMarkup, /data-media-preview-actions="true"/);

const landscapeMarkup = renderToStaticMarkup(
  <MediaPreviewFrame
    type="image"
    src="/landscape.jpg"
    width={1920}
    height={1080}
    alt="Landscape output"
    variant="work"
    showMetadata
  />
);

assert.match(landscapeMarkup, /data-media-preview-frame="work"/);
assert.match(landscapeMarkup, /16:9/);
assert.match(landscapeMarkup, /1920 x 1080/);

const cardVideoMarkup = renderToStaticMarkup(
  <MediaPreviewFrame
    type="video"
    src="/portrait.mp4"
    width={1080}
    height={1920}
    alt="Portrait source"
    variant="card"
    frameAspectRatio="9/16"
  />
);

assert.match(cardVideoMarkup, /preload="metadata"/);
assert.match(cardVideoMarkup, /aspect-ratio:9\/16/);
assert.doesNotMatch(cardVideoMarkup, /controls=""/);
