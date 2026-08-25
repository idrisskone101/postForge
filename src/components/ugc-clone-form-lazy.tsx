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

const UGCCloneFormDynamic = dynamic(
  () =>
    import("@/components/ugc-clone-form").then((mod) => ({
      default: mod.UGCCloneForm,
    })),
  { ssr: false, loading: CloneFormSkeleton },
);

const UGCCloneQueueDynamic = dynamic(
  () =>
    import("@/components/ugc-clone-queue").then((mod) => ({
      default: mod.UGCCloneQueue,
    })),
  { ssr: false, loading: CloneQueueSkeleton },
);
