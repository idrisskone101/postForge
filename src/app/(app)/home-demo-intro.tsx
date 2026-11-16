import { demoResetIntervalMinutes } from "@/lib/demo/mode";

/** Demo builds only: tells a first-time visitor what they are looking at. */
export function HomeDemoIntro() {
  const minutes = demoResetIntervalMinutes();
  const cadence = minutes === 60 ? "every hour" : `every ${minutes} minutes`;

  return (
    <section aria-label="About this demo" className="wb-notice block">
      <strong>You are in the PostForge demo.</strong> It runs on sample media made for Loamly, a
      fictional plant-care app. Open any page and edit what you find. Generation, uploads and social
      connections are switched off, and the workspace restores itself {cadence}.
    </section>
  );
}
