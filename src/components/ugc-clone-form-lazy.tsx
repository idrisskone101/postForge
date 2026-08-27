"use client";

import dynamic from "next/dynamic";
import {
  CloneFormSkeleton,
  CloneQueueSkeleton,
} from "@/app/(app)/ugc-clone/clone-form-skeleton";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";

export function UGCCloneFormLazy() {
  const ready = useWindowLoadReady();
  if (!ready) return <CloneFormSkeleton />;
  return <UGCCloneFormDynamic />;
}

export function UGCCloneQueueLazy() {
  const ready = useWindowLoadReady();
  if (!ready) return <CloneQueueSkeleton />;
  return <UGCCloneQueueDynamic />;
}

function loadUGCCloneForm() {
  return import("@/components/ugc-clone-form");
}

function loadUGCCloneQueue() {
  return import("@/components/ugc-clone-queue");
}

const UGCCloneFormDynamic = dynamic(
  () =>
    loadUGCCloneForm().then((mod) => ({
      default: mod.UGCCloneForm,
    })),
  { ssr: false, loading: CloneFormSkeleton },
);

const UGCCloneQueueDynamic = dynamic(
  () =>
    loadUGCCloneQueue().then((mod) => ({
      default: mod.UGCCloneQueue,
    })),
  { ssr: false, loading: CloneQueueSkeleton },
);

void loadUGCCloneForm();
void loadUGCCloneQueue();
