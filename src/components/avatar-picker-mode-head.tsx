import { IconButton } from "@/components/workbench";

export function AvatarPickerModeHead({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <IconButton icon="chevron-left" label="Back to avatars" size={30} onClick={onBack} />
      <h3 className="wb-panel-title min-w-0 truncate">{title}</h3>
    </div>
  );
}
