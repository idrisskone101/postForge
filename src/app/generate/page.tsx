import { getAllModels } from "@/lib/ai/models";
import { GenerationForm } from "@/components/generation-form";

export default function GeneratePage() {
  const models = getAllModels();

  return (
    <div className="relative min-h-screen animate-fade-in-up">
      {/* Ambient Organic Blobs */}
      <div className="fixed top-[-10%] right-[-5%] w-[600px] h-[600px] bg-accent-blue/10 rounded-full mix-blend-multiply blur-[80px] animate-blob z-0 pointer-events-none" />
      <div
        className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-accent-green/10 rounded-full mix-blend-multiply blur-[80px] animate-blob z-0 pointer-events-none"
        style={{ animationDelay: "2s" }}
      />

      <div className="relative z-10 mx-auto max-w-[1200px] px-6 py-10 lg:px-12 xl:px-16 pb-32">
        {/* Header */}
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm mb-4 animate-float">
            <span className="text-accent-coral text-sm">&#10024;</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Forge Mode Active
            </span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">
            Launch Forge
          </h1>
          <p className="text-muted-foreground text-lg">
            Enter your vision and let our engines bake it to perfection.
          </p>
        </header>

        <GenerationForm models={models} />
      </div>
    </div>
  );
}
