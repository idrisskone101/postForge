"use client";

import { useEffect, useState } from "react";

export function useWindowLoadReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const go = () => setReady(true);
    if (document.readyState === "complete") {
      const id = window.setTimeout(go, 0);
      return () => window.clearTimeout(id);
    }
    window.addEventListener("load", go);
    return () => window.removeEventListener("load", go);
  }, []);
  return ready;
}
