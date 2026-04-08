"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";

import { UGCCloneJobInfo, UGCCloneJobStage, useUGCCloneJob } from "@/components/ugc-clone-job-view";
import { Button } from "@/components/ui/button";

export default function UGCCloneJobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { job, isLoading, error, isRetrying, retryJob } = useUGCCloneJob(id);

  const handleRetry = async () => {
    const nextId = await retryJob();
    if (nextId) {
      router.push(`/ugc-clone/${nextId}`);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed -top-[10%] -right-[5%] h-[560px] w-[560px] rounded-full bg-accent-green/14 blur-[110px] dark:bg-accent-green/5" />
      <div
        className="pointer-events-none fixed -bottom-[20%] -left-[10%] h-[500px] w-[500px] rounded-full bg-accent-blue/12 blur-[110px] dark:bg-accent-blue/5"
        style={{ animationDelay: "1.5s" }}
      />

      <div className="relative z-10 mx-auto max-w-[1320px] px-6 py-6 lg:py-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Button variant="ghost" onClick={() => router.push(`/ugc-clone?job=${id}`)} className="h-auto rounded-full px-3 py-2 text-muted-foreground">
              <ArrowLeft className="size-4" />
              Open Workspace
            </Button>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-accent-green/10 text-accent-green">
                <Users className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                  Standalone Permalink
                </p>
                <h1 className="mt-1 text-3xl font-extrabold tracking-tight">UGC Clone Result</h1>
              </div>
            </div>
          </div>

          <div className="rounded-full border border-border bg-card/80 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Job {id.slice(0, 8)}
          </div>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_400px]">
          <UGCCloneJobStage
            key={id}
            job={job}
            isLoading={isLoading}
            error={error}
            isRetrying={isRetrying}
            onRetry={handleRetry}
          />

          {job ? (
            <UGCCloneJobInfo
              job={job}
              isRetrying={isRetrying}
              onRetry={job.status === "failed" ? handleRetry : undefined}
              onClear={() => router.push(`/ugc-clone?job=${id}`)}
              clearLabel="Open Workspace"
              permalinkHref={`/ugc-clone/${id}`}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
