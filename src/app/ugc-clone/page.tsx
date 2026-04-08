import { UGCCloneForm } from "@/components/ugc-clone-form";

export default function UGCClonePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed -top-[10%] -right-[5%] h-[600px] w-[600px] rounded-full bg-accent-green/18 blur-[110px] dark:bg-accent-green/6" />
      <div
        className="pointer-events-none fixed -bottom-[18%] -left-[8%] h-[520px] w-[520px] rounded-full bg-accent-blue/14 blur-[110px] dark:bg-accent-blue/6"
        style={{ animationDelay: "2s" }}
      />

      <div className="relative z-10 mx-auto max-w-[1380px] px-6 py-5 pb-32 lg:py-8">
        <header className="mb-5 max-w-[42rem]">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 shadow-sm">
            <span className="text-accent-coral text-sm">&#9889;</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
              Integrated Control Room
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-[2.15rem]">UGC Clone Studio</h1>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            Build the reference, review the clone, and keep recent activity in one workspace instead of bouncing between separate views.
          </p>
        </header>

        <UGCCloneForm />
      </div>
    </div>
  );
}
