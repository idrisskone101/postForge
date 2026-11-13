import { loadPerformanceInitial } from "./performance-loader";
import { PerformancePageClient } from "./performance-page-client";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  return <PerformancePageClient initial={await loadPerformanceInitial()} />;
}
