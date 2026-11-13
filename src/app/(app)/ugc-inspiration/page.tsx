import { listTrackedInspirationAccounts } from "@/lib/inspiration/service";
import { listInspirationVideos } from "@/lib/inspiration/video-page";
import { InspirationPageLazy } from "./inspiration-page-lazy";

export const metadata = { title: "Inspiration - PostForge" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UGCInspirationPage() {
  const [initialAccountPage, initialVideoPage] = await Promise.all([
    listTrackedInspirationAccounts(),
    listInspirationVideos(),
  ]);

  return (
    <InspirationPageLazy
      initialAccountPage={initialAccountPage}
      initialVideoPage={initialVideoPage}
    />
  );
}
