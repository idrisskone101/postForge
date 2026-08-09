import { handleInstagramDeauthorize } from "@/lib/integrations/meta-deauthorize";

export async function POST(request: Request) {
  return handleInstagramDeauthorize(request);
}
