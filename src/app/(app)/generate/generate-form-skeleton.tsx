import { Skeleton } from "@/components/workbench";
import { GENERATE_LAYOUT } from "./form-constants";

export function GenerateFormSkeleton() {
  return (
    <div className={GENERATE_LAYOUT.root} role="status" aria-label="Loading the generation form">
      <div className={GENERATE_LAYOUT.controls}>
        <Skeleton shape="panel" className="h-[190px]" />
        <Skeleton shape="panel" className="h-[324px]" />
        <Skeleton shape="panel" className="h-[154px]" />
        <Skeleton shape="panel" className="h-[168px]" />
      </div>
      <Skeleton shape="panel" className={GENERATE_LAYOUT.aside} />
    </div>
  );
}
