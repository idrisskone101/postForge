"use client";

import dynamic from "next/dynamic";
import {
  CloneFormSkeleton,
  CloneQueueSkeleton,
} from "@/app/(app)/ugc-clone/clone-form-skeleton";

export const UGCCloneFormLazy = dynamic(
  () =>
    import("@/components/ugc-clone-form").then((mod) => ({
      default: mod.UGCCloneForm,
    })),
  { ssr: false, loading: CloneFormSkeleton },
);

export const UGCCloneQueueLazy = dynamic(
  () =>
    import("@/components/ugc-clone-queue").then((mod) => ({
      default: mod.UGCCloneQueue,
    })),
  { ssr: false, loading: CloneQueueSkeleton },
);
