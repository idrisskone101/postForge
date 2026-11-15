"use client"

import { useLayoutEffect } from "react"

import { lockPageScroll } from "@/lib/page-scroll-lock"

/** Holds the page scroll lock for as long as the modal popup it is rendered in stays mounted. */
export function PageScrollLock() {
  useLayoutEffect(lockPageScroll, [])
  return null
}
