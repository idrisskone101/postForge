"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import type { IdentityPackSummary } from "./types";

type PackState = {
  avatarId: string | null;
  pack: IdentityPackSummary | null;
  error: string | null;
  loaded: boolean;
  retrying: boolean;
};

const POLL_MS = 4000;

export function useIdentityPack(avatarId: string | null) {
  const [state, setState] = useState<PackState>(emptyState(null));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!avatarId) return;
    let cancelled = false;
    let timer: number | undefined;
    readIdentityPack(avatarId).then((result) => {
      if (cancelled) return;
      setState((current) => ({ ...current, ...result, avatarId, loaded: true }));
      if (isPreparing(result.pack)) {
        timer = window.setTimeout(() => setTick((value) => value + 1), POLL_MS);
      }
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [avatarId, tick]);

  const current = state.avatarId === avatarId ? state : emptyState(avatarId);

  async function retry() {
    if (!avatarId || current.retrying) return;
    setState({ ...current, retrying: true, error: null });
    try {
      const pack = await apiPost<IdentityPackSummary>(
        `/api/avatars/${encodeURIComponent(avatarId)}/identity-pack`,
        { force: true }
      );
      setState({ ...current, pack, retrying: false, error: null, loaded: true });
      setTick((value) => value + 1);
    } catch (cause) {
      setState({
        ...current,
        retrying: false,
        error: cause instanceof Error ? cause.message : "Failed to start identity pack",
      });
    }
  }

  return { ...current, preparing: isPreparing(current.pack), retry };
}

function emptyState(avatarId: string | null): PackState {
  return { avatarId, pack: null, error: null, loaded: false, retrying: false };
}

function isPreparing(pack: IdentityPackSummary | null): boolean {
  return pack?.status === "queued" || pack?.status === "processing";
}

async function readIdentityPack(avatarId: string) {
  try {
    const pack = await apiGet<IdentityPackSummary | null>(
      `/api/avatars/${encodeURIComponent(avatarId)}/identity-pack`
    );
    return { pack, error: null };
  } catch (cause) {
    return {
      pack: null,
      error: cause instanceof Error ? cause.message : "Failed to load identity pack",
    };
  }
}
