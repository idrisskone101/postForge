export type CloneSourceTitle = {
  /** The creator handle when the label carries one, else the label as stored. */
  title: string;
  /** Last six digits of the TikTok video id, for a mono meta line. */
  shortId: string | null;
};

const HANDLE_AND_ID = /^(@\S+)\s+[-–—]\s+(\d{8,})$/;
const BARE_ID = /^\d{12,}$/;

/**
 * Imported sources are stored as "@handle - <19 digit video id>". The handle is
 * the name a person recognises; the id only disambiguates two clips of one creator.
 */
export function cloneSourceTitle(label: string | null | undefined): CloneSourceTitle | null {
  const text = label?.trim();
  if (!text) return null;
  const match = HANDLE_AND_ID.exec(text);
  if (match) return { title: match[1], shortId: shortVideoId(match[2]) };
  if (BARE_ID.test(text)) return { title: "TikTok video", shortId: shortVideoId(text) };
  return { title: text, shortId: null };
}

function shortVideoId(id: string) {
  return `…${id.slice(-6)}`;
}
