import { listTrackedInspirationAccounts } from "@/lib/inspiration/service";
import { listInspirationVideos } from "@/lib/inspiration/video-page";
import { InspirationPageClient } from "./inspiration-page-client";

export const metadata = { title: "Inspiration - PostForge" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UGCInspirationPage() {
  const [initialAccounts, initialVideoPage] = await Promise.all([
    listTrackedInspirationAccounts(),
    listInspirationVideos(),
  ]);

  return (
    <div className="min-w-0 bg-background">
      <InspirationPageClient
        initialAccounts={initialAccounts}
        initialVideoPage={initialVideoPage}
      />
    </div>
  );
}
