import Link from "next/link";
import { buttonClass, EmptyState, Icon } from "@/components/workbench";

export function CharactersEmpty() {
  return (
    <section aria-label="Character library" data-characters-empty className="wb-panel flex-1 p-6">
      <EmptyState icon="characters" title="No characters yet">
        <Link href="/characters/new" className={buttonClass("strong", 36)}>
          <Icon name="plus" size={16} strokeWidth={2} />
          New character
        </Link>
      </EmptyState>
    </section>
  );
}
