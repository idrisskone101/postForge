import { runAutomationPublish } from "@/lib/automation-publish-orchestration";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return runAutomationPublish(request, context);
}
