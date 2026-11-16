/**
 * Takes whatever height the inspector has left over. A prompt longer than that scrolls inside the
 * bed, and the edge it runs under fades. The padding stays outside the scroller and its height
 * rounds down to whole 19px lines, so the cut never lands inside a line. Where one line is all
 * that fits, the padding closes from 12px to 6px so that line shows whole.
 */
export function CharacterPromptBed({ prompt }: { prompt: string }) {
  return (
    <div
      data-character-prompt-bed
      className="flex min-h-[31px] min-w-0 flex-[1_1_0%] flex-col [container-type:size]"
    >
      <div className="wb-ring-host flex min-h-0 flex-col overflow-hidden rounded-lg bg-raised py-[var(--bed-pad)] [--bed-pad:clamp(6px,calc((100cqh-19px)/2),12px)]">
        <p className="wb-scroll-fade-y max-h-[round(down,calc(100cqh-2*var(--bed-pad)),19px)] min-h-0 overflow-y-auto px-3.5 text-[13px] leading-[19px] text-fg-secondary [overflow-wrap:anywhere]">
          {prompt}
        </p>
      </div>
    </div>
  );
}
