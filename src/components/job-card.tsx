"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: {
    id: string;
    type: "image" | "video";
    model: string;
    prompt: string;
    status: "queued" | "processing" | "completed" | "failed";
    estimatedCost: number;
    createdAt: string | Date;
    outputs?: { url: string }[];
  };
}

export function JobCard({ job }: JobCardProps) {
  const router = useRouter();

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-zinc-800/50"
      onClick={() => router.push(`/generate/${job.id}`)}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{job.model}</CardTitle>
          <Badge
            variant="outline"
            className={cn("text-[10px] capitalize", STATUS_STYLES[job.status])}
          >
            {job.status}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2 text-xs">
          {job.prompt}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{formatCost(job.estimatedCost)}</span>
          <span>{formatRelativeDate(job.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}


const STATUS_STYLES: Record<string, string> = {
  queued: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  processing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
};