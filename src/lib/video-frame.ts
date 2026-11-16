/**
 * The address of a stored video with a media fragment that parks it just past its start.
 * Safari decodes no frame for an idle `preload="metadata"` video, so the tile stays an empty
 * box; a `#t=` fragment makes every engine seek and paint that frame. The app stores no
 * poster images for its videos, so the frame comes from the file itself.
 */
export function videoFrameSrc(src: string): string {
  return src.includes("#") ? src : `${src}#t=${VIDEO_START_SECONDS}`;
}

/** Close enough to zero that playback still starts on the first frame. */
const VIDEO_START_SECONDS = 0.001;
