export type PinterestImageCandidate = {
  id: string;
  imageUrl: string;
  sourceUrl: string;
  title?: string;
  altText?: string;
  width?: number;
  height?: number;
};

export type PinterestCandidateSource = "search" | "board";

export type PinterestCandidateResult = {
  source: PinterestCandidateSource;
  sourceUrl: string;
  candidates: PinterestImageCandidate[];
  cursor: string | null;
  hasMore: boolean;
};

export const MAX_CANDIDATES = 50;
export const MAX_CURSOR_LENGTH = 8_192;
