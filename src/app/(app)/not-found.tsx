import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-[80dvh] min-w-0 items-center justify-center p-6">
      <Card className="w-full min-w-0 max-w-md border-[#DADBD2] bg-white">
        <CardContent className="flex flex-col items-center text-center pt-8 pb-8 px-6 space-y-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-[#FFF0EC]">
            <FileQuestion className="size-7 text-[#FF4A20]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[#1C1B17]">
              Page Not Found
            </h2>
            <p className="text-sm leading-relaxed text-[#777873]">
              The page you are looking for does not exist or has been moved.
            </p>
          </div>
          <Link
            href="/"
            prefetch={false}
            className="pf-button-primary mt-2"
          >
            Go Home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
