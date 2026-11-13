/**
 * Asks for six lines and takes whatever height the inspector has left over. A prompt longer than
 * that scrolls inside the bed, and the edge it runs under fades. The padding stays outside the
 * scroller and its height rounds down to whole 19px lines, so the cut never lands inside a line.
 */
export function CharacterPromptBed({ prompt }: { prompt: string }) {
  return (
    <div
      data-character-prompt-bed
      className="flex min-h-[81px] min-w-0 flex-[1_1_138px] flex-col [container-type:size]"
    >
      <div className="flex min-h-0 flex-col overflow-hidden rounded-lg bg-raised py-3">
        <p className="wb-scroll-fade-y max-h-[round(down,100cqh-24px,19px)] min-h-0 overflow-y-auto px-3.5 text-[13px] leading-[19px] text-fg-secondary [overflow-wrap:anywhere]">
          {prompt}
        </p>
      </div>
    </div>
  );
}
