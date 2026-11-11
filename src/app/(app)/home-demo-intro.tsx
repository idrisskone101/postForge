import { demoResetIntervalMinutes } from "@/lib/demo/mode";

/** Demo builds only: tells a first-time visitor what they are looking at. */
export function HomeDemoIntro() {
  const minutes = demoResetIntervalMinutes();
  const cadence = minutes === 60 ? "every hour" : `every ${minutes} minutes`;

  return (
    <section aria-label="About this demo" data-demo-intro="true" className="pf-card">
      <i aria-hidden="true" />
      <div>
        <h2>You are in the PostForge demo</h2>
        <p>
          PostForge is a self-hosted pipeline for AI marketing content. This
          copy runs on sample media generated for Loamly, a fictional plant-care
          app. Open any tab and edit what you find. Generation, uploads, and
          social connections are switched off, and the workspace restores
          itself {cadence}.
        </p>
      </div>
    </section>
  );
}
