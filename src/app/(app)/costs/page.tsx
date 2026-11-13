import {
  parseCostLogModel,
  parseCostLogSearch,
  parseLogPage,
  parseSpendPeriod,
} from "@/lib/costs/spend-period";
import { CostsPageClient } from "./costs-page-client";
import { loadSpendDashboard } from "./spend-loader";
import { EMPTY_COSTS_DASHBOARD } from "./spend-models";

export const metadata = { title: "Spend - PostForge" };

interface CostsPageProps {
  searchParams: Promise<{
    period?: string;
    logPage?: string;
    q?: string;
    model?: string;
  }>;
}

export default async function CostsPage({ searchParams }: CostsPageProps) {
  const params = await searchParams;
  const dashboard = await loadSpendDashboard(params).catch((error) => {
    console.error("Failed to load spend dashboard:", error);
    return null;
  });
  if (dashboard) {
    // The same JSON shape the client refetch receives from /api/costs/dashboard.
    const payload = JSON.parse(JSON.stringify(dashboard)) as typeof dashboard;
    return <CostsPageClient {...payload} preloaded />;
  }
  return (
    <CostsPageClient
      {...EMPTY_COSTS_DASHBOARD}
      period={parseSpendPeriod(params.period)}
      search={parseCostLogSearch(params.q)}
      model={parseCostLogModel(params.model)}
      logPage={parseLogPage(params.logPage)}
    />
  );
}
