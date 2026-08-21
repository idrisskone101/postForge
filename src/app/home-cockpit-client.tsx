"use client";

import { useRouter } from "next/navigation";
import { HomeCockpit, type HomeDashboard } from "./home-cockpit";

export function HomeCockpitClient({ dashboard }: { dashboard: HomeDashboard }) {
  const router = useRouter();
  return (
    <HomeCockpit
      dashboard={dashboard}
      onReviewSaved={() => {
        router.refresh();
      }}
    />
  );
}
