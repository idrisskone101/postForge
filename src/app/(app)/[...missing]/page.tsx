import { notFound } from "next/navigation";

/**
 * The app has two root layouts and no shared one, so a URL that matches no route would fall to the
 * bare framework 404. This catch-all sends it to the designed not-found page inside the app shell.
 */
export default function MissingPage() {
  notFound();
}
