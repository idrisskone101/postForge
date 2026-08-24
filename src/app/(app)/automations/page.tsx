import {
  isAutomationRecord,
  type AutomationRecord,
} from "@/lib/automations";
import { readWorkspaceFeatureRecords } from "@/lib/workspace-feature-store";
import { AutomationsPageClient } from "./automations-page-client";

export default async function AutomationsPage() {
  const records = (
    await readWorkspaceFeatureRecords<AutomationRecord>("automations")
  ).filter(isAutomationRecord);

  return <AutomationsPageClient initialRecords={records} />;
}
