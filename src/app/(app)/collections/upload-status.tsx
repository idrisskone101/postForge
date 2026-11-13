import { Meter } from "@/components/workbench";
import type { UploadProgress } from "./types";

export function UploadStatus({ progress }: { progress: UploadProgress }) {
  const { done, total } = progress;
  return (
    <div role="status" className="wb-toast gap-3 pr-4">
      <span className="shrink-0">Uploading images</span>
      <Meter label="Upload progress" value={Math.max(4, (done / total) * 100)} running />
      <span className="wb-mono shrink-0 text-fg-secondary">
        {done} / {total}
      </span>
    </div>
  );
}
