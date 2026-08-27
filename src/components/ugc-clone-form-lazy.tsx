"use client";

import dynamic from "next/dynamic";
import {
  CloneFormSkeleton,
  CloneQueueSkeleton,
} from "@/app/(app)/ugc-clone/clone-form-skeleton";

export function UGCCloneFormLazy() {
  return <UGCCloneFormDynamic />;
}

export function UGCCloneQueueLazy() {
  return <UGCCloneQueueDynamic />;
}

const UGCCloneFormDynamic = dynamic(
  () =>
    import("@/components/ugc-clone-form").then((mod) => ({
      default: mod.UGCCloneForm,
    })),
  { loading: CloneFormSkeleton },
);

const UGCCloneQueueDynamic = dynamic(
  () =>
    import("@/components/ugc-clone-queue").then((mod) => ({
      default: mod.UGCCloneQueue,
    })),
  { loading: CloneQueueSkeleton },
);
