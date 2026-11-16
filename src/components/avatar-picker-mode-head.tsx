import { IconButton } from "@/components/workbench";

export function AvatarPickerModeHead({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <IconButton icon="chevron-left" label="Back to avatars" size={30} onClick={onBack} />
      <h3
        ref={takeFocus}
        tabIndex={-1}
        className="wb-panel-title min-w-0 truncate rounded-sm focus-visible:[outline:2px_solid_var(--pf-ember)] focus-visible:outline-offset-4"
      >
        {title}
      </h3>
    </div>
  );
}

/** A mode replaces the control that opened it, so its title takes the focus that control held. */
function takeFocus(title: HTMLElement | null) {
  title?.focus({ preventScroll: true });
}
