import { AutomationBuilderClientLazy } from "./automation-builder-client-lazy";
import { PlaybookOverlayStatic } from "./playbook-overlay-static";
import { SlideshowAutomationBuilderLazy } from "./slideshow-automation-builder-lazy";

export default async function AutomationBuilderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const workflow = typeof params.workflow === "string" ? params.workflow : null;
  const search = {
    id: params.id,
    sourceFileId: params.sourceFileId,
    template: params.template,
    intent: params.intent,
  };
  const editId = typeof params.id === "string" ? params.id : null;
  const applying = params.intent === "apply";

  if (workflow === "slideshow") {
    return <SlideshowAutomationBuilderLazy search={search} />;
  }

  return (
    <>
      {editId || applying ? null : <PlaybookOverlayStatic />}
      <AutomationBuilderClientLazy search={search} />
    </>
  );
}
