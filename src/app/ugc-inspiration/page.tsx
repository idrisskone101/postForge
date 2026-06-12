import { listTrackedInspirationAccounts } from "@/lib/inspiration/service";
import { InspirationPageClient } from "./inspiration-page-client";

export const metadata = { title: "Inspiration - PostForge" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UGCInspirationPage() {
  const initialAccounts = await listTrackedInspirationAccounts();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed -top-[10%] -right-[5%] h-[600px] w-[600px] rounded-full bg-accent-blue/20 blur-[100px] mix-blend-multiply animate-blob z-0 dark:mix-blend-screen dark:bg-accent-blue/5" />
      <div
        className="pointer-events-none fixed -bottom-[18%] -left-[10%] h-[520px] w-[520px] rounded-full bg-accent-green/20 blur-[100px] mix-blend-multiply animate-blob z-0 dark:mix-blend-screen dark:bg-accent-green/5"
        style={{ animationDelay: "2s" }}
      />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-6 pb-24 lg:py-10 animate-fade-in-up">
        <InspirationPageClient initialAccounts={initialAccounts} />
      </div>
    </div>
  );
}
