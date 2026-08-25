import { AutomationBuilderLazy } from "./automation-builder-lazy";
import { SlideshowAutomationBuilder } from "./slideshow-automation-builder";

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
  };

  return workflow === "slideshow" ? (
    <SlideshowAutomationBuilder search={search} />
  ) : (
    <AutomationBuilderLazy search={search} />
  );
}
