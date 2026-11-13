"use client";

import { useSyncExternalStore } from "react";

/**
 * False on the server and during hydration, true afterwards. Use it for output
 * that depends on the browser (time zone, storage) inside server-rendered markup.
 */
export function useHydrated() {
  return useSyncExternalStore(subscribeNever, readClient, readServer);
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
