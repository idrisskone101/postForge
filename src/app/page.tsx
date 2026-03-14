import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getCostSummary } from "@/lib/costs/tracker";
import { MediaPreview } from "@/components/media-preview";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import {
  Zap,
  Camera,
  Film,
  Sparkles,
  ArrowRight,
  Wand2,
  Play,
  Download,
  Trash2,
  Plus,
} from "lucide-react";

export default async function DashboardPage() {
  const [todaySummary, monthSummary, activeCount, recentJobs] =
    await Promise.all([
      getCostSummary({ period: "today" }),
      getCostSummary({ period: "month" }),
      prisma.generationJob.count({
        where: { status: { in: ["queued", "processing"] } },
      }),
      prisma.generationJob.findMany({
        where: { status: "completed" },
        include: { outputs: { take: 1 } },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
    ]);

  const todayJobs =
    todaySummary.breakdown.image.count + todaySummary.breakdown.video.count;
  const monthBudget = 62;
  const budgetPercent = Math.min(
    (monthSummary.totalCost / monthBudget) * 100,
    100
  );
  // SVG circle math: r=40, circumference = 2*pi*40 = 251.2
  const circumference = 251.2;
  const dashOffset = circumference - (budgetPercent / 100) * circumference;

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = today.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Ambient Blobs - fixed position */}
      <div className="pointer-events-none fixed -top-[10%] -right-[5%] w-[600px] h-[600px] rounded-full bg-accent-blue/20 mix-blend-multiply blur-[80px] animate-blob z-0 dark:mix-blend-screen dark:bg-accent-blue/10" />
      <div className="pointer-events-none fixed top-[20%] right-[10%] w-[500px] h-[500px] rounded-full bg-accent-coral/20 mix-blend-multiply blur-[80px] animate-blob z-0 dark:mix-blend-screen dark:bg-accent-coral/10" style={{ animationDelay: "2s" }} />
      <div className="pointer-events-none fixed -bottom-[20%] -left-[10%] w-[700px] h-[700px] rounded-full bg-accent-green/15 mix-blend-multiply blur-[100px] animate-blob z-0 dark:mix-blend-screen dark:bg-accent-green/8" style={{ animationDelay: "4s" }} />

      <div className="relative z-10 max-w-[1200px] mx-auto px-8 py-8 lg:py-12 xl:px-16 animate-fade-in-up">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="flex items-center gap-6">
            {/* Naruto Mascot */}
            <div className="relative flex-shrink-0 hidden sm:block animate-float">
              <div className="absolute inset-0 rounded-full bg-accent-coral/25 blur-xl scale-110" />
              <div className="relative w-24 h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden border-[3px] border-accent-coral/40 shadow-[0_8px_32px_rgba(255,122,89,0.25)] hover:scale-110 hover:border-accent-coral/70 hover:shadow-[0_12px_40px_rgba(255,122,89,0.4)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
                <Image
                  src="/naruto-mascot.png"
                  alt="Naruto mascot"
                  width={112}
                  height={112}
                  className="w-full h-full object-cover scale-125"
                  priority
                />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm mb-4 animate-float">
                <span className="w-2 h-2 rounded-full bg-accent-green" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  All Systems Go
                </span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight mb-2">
                Ready to create magic?
              </h1>
              <p className="text-muted-foreground text-lg">
                {dayName}, {monthDay} &bull; Let&apos;s make something awesome today.
              </p>
            </div>
          </div>

          <Link href="/generate">
            <button className="bg-accent-coral text-white font-bold px-8 py-4 rounded-full flex items-center gap-3 hover:brightness-110 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:scale-105 shadow-[0_8px_24px_rgba(255,122,89,0.3)] cursor-pointer">
              <Wand2 className="size-[22px]" />
              Launch New Forge
            </button>
          </Link>
        </header>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
          {/* Spend Card - spans 2 */}
          <div className="md:col-span-2 bg-card rounded-[32px] p-8 border border-border shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-between group cursor-default">
            <div className="flex flex-col justify-between h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-[20px] bg-accent-blue/10 text-accent-blue flex items-center justify-center">
                  <Zap className="size-6" />
                </div>
                <span className="font-bold text-lg">Energy Used</span>
              </div>
              <div>
                <div className="text-5xl font-extrabold tracking-tight mb-2">
                  {formatCost(monthSummary.totalCost)}
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Generated {todayJobs} assets today
                </p>
              </div>
            </div>

            {/* Circular Progress */}
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg
                className="w-full h-full -rotate-90"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-muted/50"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  className="text-accent-coral group-hover:text-accent-coral/80 transition-colors duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold">
                  {budgetPercent.toFixed(0)}%
                </span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                  Monthly
                </span>
              </div>
            </div>
          </div>

          {/* Images Card */}
          <div className="bg-card rounded-[32px] p-8 border border-border shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col justify-between group cursor-default">
            <div className="w-14 h-14 rounded-[24px] bg-accent-green/10 text-accent-green flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
              <Camera className="size-7" />
            </div>
            <div>
              <div className="text-4xl font-extrabold mb-1">
                {todaySummary.breakdown.image.count}
              </div>
              <div className="text-sm font-semibold text-muted-foreground">
                Images Crafted
              </div>
            </div>
          </div>

          {/* Videos Card */}
          <div className="bg-card rounded-[32px] p-8 border border-border shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col justify-between relative group cursor-default">
            {activeCount > 0 && (
              <div className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1.5 bg-accent-blue/10 text-accent-blue rounded-full text-xs font-bold">
                <div className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
                {activeCount} Baking
              </div>
            )}
            <div className="w-14 h-14 rounded-[24px] bg-accent-blue/10 text-accent-blue flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
              <Film className="size-7" />
            </div>
            <div>
              <div className="text-4xl font-extrabold mb-1">
                {todaySummary.breakdown.video.count}
              </div>
              <div className="text-sm font-semibold text-muted-foreground">
                Videos Baked
              </div>
            </div>
          </div>
        </div>

        {/* Recent Generations */}
        <section>
          <div className="flex items-center justify-between mb-8 px-2">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-accent-coral/10 text-accent-coral flex items-center justify-center">
                <Sparkles className="size-[18px]" />
              </span>
              Your Latest Magic
            </h2>
            <Link
              href="/gallery"
              className="text-sm font-bold text-accent-blue hover:text-accent-blue/80 transition-colors flex items-center gap-2 bg-accent-blue/5 px-4 py-2 rounded-full hover:bg-accent-blue/10"
            >
              Explore Gallery <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {recentJobs.map((job) => {
              const output = job.outputs[0];
              const isVideo = job.type === "video";
              return (
                <div
                  key={job.id}
                  className="group relative rounded-[32px] overflow-hidden border border-border bg-card aspect-[4/5] cursor-pointer shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-2"
                >
                  {output && (
                    <Link href={`/generate/${job.id}`}>
                      <MediaPreview
                        type={job.type as "image" | "video"}
                        src={`/api/files/${output.id}`}
                        width={output.width ?? undefined}
                        height={output.height ?? undefined}
                        alt={job.prompt}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    </Link>
                  )}

                  {/* Video badge */}
                  {isVideo && output?.durationSec && (
                    <div className="absolute top-4 left-4 bg-white/90 dark:bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-accent-blue flex items-center gap-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                      <Play className="size-3.5" /> 0:{String(output.durationSec).padStart(2, "0")}
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 glass-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
                      <p className="text-base font-bold line-clamp-2 mb-2 leading-snug">
                        {job.prompt}
                      </p>
                      <p
                        className={`text-xs font-bold mb-5 inline-block px-3 py-1 rounded-full ${
                          isVideo
                            ? "text-accent-blue bg-accent-blue/10"
                            : "text-accent-green bg-accent-green/10"
                        }`}
                      >
                        {job.model}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {formatRelativeDate(job.createdAt)}
                        </span>
                        <div className="flex gap-2">
                          <a
                            href={output ? `/api/files/${output.id}` : "#"}
                            download
                            className="w-10 h-10 rounded-[16px] bg-card hover:text-accent-blue hover:bg-accent-blue/10 shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex items-center justify-center transition-all hover:scale-110"
                          >
                            <Download className="size-[18px]" />
                          </a>
                          <button className="w-10 h-10 rounded-[16px] bg-card hover:text-accent-coral hover:bg-accent-coral/10 shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex items-center justify-center transition-all hover:scale-110">
                            <Trash2 className="size-[18px]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Plant a Seed / Empty state CTA */}
            <Link href="/generate">
              <div className="rounded-[32px] overflow-hidden border-2 border-dashed border-accent-blue/30 bg-accent-blue/5 aspect-[4/5] flex flex-col items-center justify-center p-8 text-center group cursor-pointer hover:border-accent-blue hover:bg-accent-blue/10 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-2">
                <div className="w-16 h-16 rounded-[24px] bg-card text-accent-blue shadow-[0_8px_24px_rgba(79,159,217,0.15)] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-90 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
                  <Plus className="size-8" />
                </div>
                <p className="text-lg font-bold">Plant a Seed</p>
                <p className="text-sm text-muted-foreground mt-2 font-medium">
                  Start a new prompt and watch it grow.
                </p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
