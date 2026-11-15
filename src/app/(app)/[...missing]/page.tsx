import { notFound } from "next/navigation";
import { isMissingPagePath } from "@/lib/app-routes";
import NotFound from "../not-found";

/**
 * The app has two root layouts and no shared one, so a URL that matches no route would fall to the
 * bare framework 404. This catch-all draws the designed not-found page inside the app shell.
 *
 * It renders the page instead of throwing notFound(), so the server sends real HTML in the stored
 * theme. The middleware has already set the 404 status for exactly these paths. A path the
 * middleware does not see (an unknown API route or file name) still throws, which keeps its 404.
 */
export default async function MissingPage({
  params,
}: {
  params: Promise<{ missing: string[] }>;
}) {
  const { missing } = await params;
  if (!isMissingPagePath(`/${missing.join("/")}`)) notFound();
  return <NotFound />;
}
