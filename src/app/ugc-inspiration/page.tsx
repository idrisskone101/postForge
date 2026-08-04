import { listTrackedInspirationAccounts } from "@/lib/inspiration/service";
import { InspirationPageClient } from "./inspiration-page-client";

export const metadata = { title: "Inspiration - PostForge" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UGCInspirationPage() {
  const initialAccounts = await listTrackedInspirationAccounts();

  return (
    <div className="min-w-0 bg-background">
      <InspirationPageClient initialAccounts={initialAccounts} />
    </div>
  );
}
