import { isSettingsTab } from "./settings-navigation";
import { SettingsPageClient } from "./settings-page-client";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const requested = (await searchParams).tab;
  const tab = typeof requested === "string" && isSettingsTab(requested) ? requested : "integrations";
  return <SettingsPageClient initialTab={tab} />;
}
