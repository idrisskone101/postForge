"use client";

import { useState, useSyncExternalStore } from "react";

/**
 * False on the server and during hydration, true afterwards. Use it for output
 * that depends on the browser (time zone, storage) inside server-rendered markup.
 */
export function useHydrated() {
  return useSyncExternalStore(subscribeNever, readClient, readServer);
}

/**
 * True when the component first rendered in the browser (client navigation or a
 * late mount), false when its markup came from the server. An entrance fade on
 * server markup starts the first paint at opacity 0, which hides the page's
 * largest content from that paint, so only browser mounts should play one.
 */
export function useMountedInBrowser() {
  const hydrated = useHydrated();
  const [mountedInBrowser] = useState(hydrated);
  return mountedInBrowser;
}

function subscribeNever() {
  return unsubscribe;
}

function unsubscribe() {}

function readClient() {
  return true;
}

function readServer() {
  return false;
}
