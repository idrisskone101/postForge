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
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800">
        <CardContent className="flex flex-col items-center text-center pt-8 pb-8 px-6 space-y-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="size-7 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">
              Something went wrong
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {error.message ||
                "An unexpected error occurred. Please try again."}
            </p>
            {error.digest && (
              <p className="text-xs text-zinc-600 font-mono">
                Error ID: {error.digest}
              </p>
            )}
          </div>
          <Button
            onClick={reset}
            variant="destructive"
            className="mt-2"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
