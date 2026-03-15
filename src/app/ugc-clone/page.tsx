import { UGCCloneForm } from "@/components/ugc-clone-form";
import { UGCCloneQueue } from "@/components/ugc-clone-queue";

export default function UGCClonePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Ambient Blobs */}
      <div className="pointer-events-none fixed -top-[10%] -right-[5%] w-[600px] h-[600px] rounded-full bg-accent-green/20 mix-blend-multiply blur-[100px] animate-blob z-0 dark:mix-blend-screen dark:bg-accent-green/5" />
      <div
        className="pointer-events-none fixed -bottom-[20%] -left-[10%] w-[500px] h-[500px] rounded-full bg-accent-blue/20 mix-blend-multiply blur-[100px] animate-blob z-0 dark:mix-blend-screen dark:bg-accent-blue/5"
        style={{ animationDelay: "2s" }}
      />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-6 lg:py-10 pb-32 animate-fade-in-up">
        {/* Header */}
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm mb-4">
            <span className="text-accent-coral text-sm">&#9889;</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Clone Mode Active
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">
            UGC Clone
          </h1>
          <p className="text-muted-foreground text-base">
            Paste a TikTok, pick your avatar, and clone the motion.
          </p>
        </header>

        <UGCCloneForm />

        <div className="mt-8">
          <UGCCloneQueue />
        </div>
      </div>
    </div>
  );
}
