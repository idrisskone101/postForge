import { getAllModels } from "@/lib/ai/models";
import { GenerationForm } from "@/components/generation-form";

export default function GeneratePage() {
  const models = getAllModels();

  return (
    <div className="relative min-h-screen animate-fade-in-up">
      <div className="relative z-10 mx-auto max-w-[1200px] px-6 py-12 lg:px-12 xl:px-16 pb-32">
        {/* Header */}
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-card border border-border mb-4">
            <span className="text-accent-coral text-sm">&#10024;</span>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">
              Forge Mode Active
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Generate
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure generative parameters for precise content synthesis.
          </p>
        </header>

        <GenerationForm models={models} />
      </div>
    </div>
  );
}
