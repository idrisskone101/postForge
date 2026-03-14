import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800">
        <CardContent className="flex flex-col items-center text-center pt-8 pb-8 px-6 space-y-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-zinc-800">
            <FileQuestion className="size-7 text-zinc-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">
              Page Not Found
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              The page you are looking for does not exist or has been moved.
            </p>
          </div>
          <Link
            href="/"
            className="mt-2 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go Home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
