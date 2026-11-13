/**
 * Asks for six lines and takes whatever height the inspector has left over. A prompt longer than
 * that scrolls inside the bed, and the edge it runs under fades.
 */
export function CharacterPromptBed({ prompt }: { prompt: string }) {
  return (
    <div data-character-prompt-bed className="flex min-h-[81px] min-w-0 flex-[1_1_138px] flex-col">
      <div className="flex min-h-0 flex-col overflow-hidden rounded-lg bg-raised">
        <p className="wb-scroll-fade-y min-h-0 overflow-y-auto px-3.5 py-3 text-[13px] leading-[19px] text-fg-secondary [overflow-wrap:anywhere]">
          {prompt}
        </p>
      </div>
    </div>
  );
}
