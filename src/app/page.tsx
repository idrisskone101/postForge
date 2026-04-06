import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getCostSummary } from "@/lib/costs/tracker";
import { MediaPreview } from "@/components/media-preview";
import { storage } from "@/lib/storage";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import {
  Camera,
  Film,
  Sparkles,
  ArrowRight,
  Wand2,
  Play,
  Download,
  Trash2,
  History,
} from "lucide-react";

export default async function DashboardPage() {
  const [todaySummary, monthSummary, activeCount, recentJobs, activeJobs] =
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
      prisma.generationJob.findMany({
        where: { status: { in: ["queued", "processing"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const lifetimeCount =
    monthSummary.breakdown.image.count + monthSummary.breakdown.video.count;
  const monthBudget = 62;
  const budgetPercent = Math.min(
    (monthSummary.totalCost / monthBudget) * 100,
    100
  );
  // SVG circle math: r=18, circumference = 2*pi*18 = 113.1
  const circumference = 113.1;
  const dashOffset = circumference - (budgetPercent / 100) * circumference;

  const today = new Date();
  const monthDay = today.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const validRecentJobs = (
    await Promise.all(
      recentJobs.map(async (job) => {
        const output = job.outputs[0];
        if (!output) return null;
        return (await storage.exists(output.localPath)) ? job : null;
      })
    )
  ).filter(Boolean) as typeof recentJobs;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Ambient Blobs */}
      <div className="pointer-events-none fixed -top-[10%] -right-[5%] w-[600px] h-[600px] rounded-full bg-accent-blue/20 mix-blend-multiply blur-[100px] animate-blob z-0 dark:mix-blend-screen dark:bg-accent-blue/5" />
      <div
        className="pointer-events-none fixed top-[20%] right-[10%] w-[500px] h-[500px] rounded-full bg-accent-coral/20 mix-blend-multiply blur-[100px] animate-blob z-0 dark:mix-blend-screen dark:bg-accent-coral/5"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="pointer-events-none fixed -bottom-[20%] -left-[10%] w-[700px] h-[700px] rounded-full bg-accent-green/15 mix-blend-multiply blur-[100px] animate-blob z-0 dark:mix-blend-screen dark:bg-accent-green/5"
        style={{ animationDelay: "4s" }}
      />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-6 lg:py-10 animate-fade-in-up">
        {/* Compact Utility Header */}
        <header className="flex items-center justify-between bg-card/20 border border-border rounded-xl p-2 pr-4 pl-2 mb-6">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-accent-coral/40">
              <Image
                src="/naruto-mascot.png"
                alt="Naruto mascot"
                width={40}
                height={40}
                className="w-full h-full object-cover scale-125"
                priority
              />
            </div>
            <span className="text-base font-bold">
              Ready to create magic?
            </span>
            <span className="text-muted-foreground hidden sm:inline">&middot;</span>
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
              {monthDay}
            </span>
          </div>

          <Link href="/generate">
            <button className="bg-accent-coral text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:brightness-110 transition-all duration-300 cursor-pointer">
              <Wand2 className="size-3.5" />
              New Forge
            </button>
          </Link>
        </header>

        {/* Data Metrics Toolbar */}
        <div className="bg-card rounded-xl p-5 border border-border shadow-sm mb-6">
          <div className="flex flex-wrap md:flex-nowrap items-center divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Energy Spent */}
            <div className="flex items-center gap-3 pr-6 py-3 md:py-0">
              <div className="relative w-12 h-12 flex-shrink-0">
                <svg
                  className="w-full h-full -rotate-90"
                  viewBox="0 0 44 44"
                >
                  <circle
                    cx="22"
                    cy="22"
                    r="18"
                    stroke="currentColor"
                    strokeWidth="5"
                    fill="transparent"
                    className="text-muted/50"
                  />
                  <circle
                    cx="22"
                    cy="22"
                    r="18"
                    stroke="currentColor"
                    strokeWidth="5"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className="text-accent-coral"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] font-bold">
                    {budgetPercent.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Energy Spent
                </div>
                <div className="text-base font-bold">
                  {formatCost(monthSummary.totalCost)}
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="flex items-center gap-3 px-6 py-3 md:py-0">
              <div className="w-9 h-9 rounded-lg bg-accent-green/10 text-accent-green flex items-center justify-center flex-shrink-0">
                <Camera className="size-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Images
                </div>
                <div className="text-base font-bold">
                  {todaySummary.breakdown.image.count}
                </div>
              </div>
            </div>

            {/* Videos */}
            <div className="flex items-center gap-3 px-6 py-3 md:py-0">
              <div className="w-9 h-9 rounded-lg bg-accent-blue/10 text-accent-blue flex items-center justify-center flex-shrink-0">
                <Film className="size-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Videos
                </div>
                <div className="text-base font-bold flex items-center gap-2">
                  {todaySummary.breakdown.video.count}
                  {activeCount > 0 && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-accent-blue/10 text-accent-blue rounded-lg text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
                      {activeCount} Baking
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Lifetime */}
            <div className="flex items-center gap-3 pl-6 py-3 md:py-0">
              <div className="w-9 h-9 rounded-lg bg-muted/50 text-muted-foreground flex items-center justify-center flex-shrink-0">
                <History className="size-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Lifetime
                </div>
                <div className="text-base font-bold">{lifetimeCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* In Progress Section */}
        {activeCount > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                In Progress
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {activeJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/generate/${job.id}`}
                  className="flex items-center gap-3 bg-card/30 border border-border rounded-xl px-4 py-1.5 shrink-0 hover:bg-card/50 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse shadow-[0_0_8px_rgba(79,159,217,0.4)]" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {job.prompt.length > 25
                      ? job.prompt.slice(0, 25) + "…"
                      : job.prompt}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Generations */}
        <section>
          <div className="flex items-center justify-between mb-8 px-2">
            <h2 className="text-lg font-bold flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-accent-coral/10 text-accent-coral flex items-center justify-center">
                <Sparkles className="size-[18px]" />
              </span>
              Latest Assets
            </h2>
            <Link
              href="/gallery"
              className="text-sm font-bold text-accent-blue hover:text-accent-blue/80 transition-colors flex items-center gap-2 bg-accent-blue/5 px-4 py-2 rounded-xl hover:bg-accent-blue/10"
            >
              View Gallery <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {validRecentJobs.map((job) => {
              const output = job.outputs[0];
              const isVideo = job.type === "video";
              return (
                <div
                  key={job.id}
                  className="group relative rounded-2xl overflow-hidden border border-border bg-card aspect-[4/5] cursor-pointer shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1.5"
                >
                  {output && (
                    <Link
                      href={`/generate/${job.id}`}
                      className="absolute inset-0"
                    >
                      <MediaPreview
                        type={job.type as "image" | "video"}
                        src={`/api/files/${output.id}`}
                        width={output.width ?? undefined}
                        height={output.height ?? undefined}
                        alt={job.prompt}
                        fill
                        className="w-full h-full transition-transform duration-700 group-hover:scale-110"
                      />
                    </Link>
                  )}

                  {/* Video badge */}
                  {isVideo && output?.durationSec && (
                    <div className="absolute top-4 left-4 bg-white/90 dark:bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-bold text-accent-blue flex items-center gap-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                      <Play className="size-3.5" /> 0:
                      {String(output.durationSec).padStart(2, "0")}
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 glass-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
                      <p className="text-base font-bold line-clamp-2 mb-2 leading-snug">
                        {job.prompt}
                      </p>
                      <p
                        className={`text-xs font-bold mb-5 inline-block px-3 py-1 rounded-lg ${
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
                            className="w-8 h-8 rounded-xl bg-card hover:text-accent-blue hover:bg-accent-blue/10 shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex items-center justify-center transition-all hover:scale-110"
                          >
                            <Download className="size-4" />
                          </a>
                          <button className="w-8 h-8 rounded-xl bg-card hover:text-accent-coral hover:bg-accent-coral/10 shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex items-center justify-center transition-all hover:scale-110">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
