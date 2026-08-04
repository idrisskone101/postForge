"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[80dvh] min-w-0 items-center justify-center p-6">
      <Card className="w-full min-w-0 max-w-md border-[#DADBD2] bg-white">
        <CardContent className="flex min-w-0 flex-col items-center space-y-4 px-6 pb-8 pt-8 text-center">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="size-7 shrink-0 text-red-500" />
          </div>
          <div className="w-full min-w-0 space-y-2">
            <h2 className="text-lg font-semibold text-[#232323]">
              Something went wrong
            </h2>
            <p className="min-w-0 break-words text-sm leading-relaxed text-[#777873] [overflow-wrap:anywhere]">
              {error.message ||
                "An unexpected error occurred. Please try again."}
            </p>
            {error.digest && (
              <p className="min-w-0 break-words font-mono text-xs text-[#92938E] [overflow-wrap:anywhere]">
                Error ID: {error.digest}
              </p>
            )}
          </div>
          <Button
            onClick={reset}
            variant="destructive"
            className="mt-2 shrink-0"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
