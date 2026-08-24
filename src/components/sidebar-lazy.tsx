"use client";

import dynamic from "next/dynamic";

export const Sidebar = dynamic(
  () => import("./sidebar").then((mod) => ({ default: mod.Sidebar })),
  { ssr: false },
);
