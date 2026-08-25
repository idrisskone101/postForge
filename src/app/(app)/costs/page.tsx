import {
  parseCostLogModel,
  parseCostLogSearch,
  parseLogPage,
  parseSpendPeriod,
} from "@/lib/costs/spend-period";
import { CostsPageClient } from "./costs-page-client";
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
