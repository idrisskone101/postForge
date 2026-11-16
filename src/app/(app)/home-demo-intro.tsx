import Link from "next/link";
import { Icon } from "@/components/workbench/icon";
import { Panel } from "@/components/workbench/panel";
import { demoResetIntervalMinutes } from "@/lib/demo/mode";
import { DEMO_TOUR } from "@/lib/demo/tour";

/** Demo builds only: says what the visitor is looking at, then walks the campaign. */
export function HomeDemoIntro() {
  const minutes = demoResetIntervalMinutes();
  const cadence = minutes === 60 ? "every hour" : `every ${minutes} minutes`;

  return (
    <>
      <section aria-label="About this demo" className="wb-notice block">
        <strong>You are in the PostForge demo.</strong> Everything here is sample content from one
        launch campaign for Saylo, a fictional language app, made with the same models PostForge
        calls. Generation, uploads and social connections are switched off, and the workspace
        restores itself {cadence}.
      </section>
      <Panel title="Campaign tour" aria-label="Campaign tour">
        <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {DEMO_TOUR.map((stop, index) => (
            <li key={stop.href} className="flex">
              <Link
                href={stop.href}
                className="group flex w-full items-start gap-3 rounded-[12px] bg-raised p-4 transition-colors duration-150 hover:bg-raised-strong"
              >
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-raised-strong text-[13px] font-semibold text-fg-secondary group-hover:bg-panel"
                >
                  {index + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[14px] font-semibold leading-5 text-fg">{stop.title}</span>
                  <span className="text-[13px] leading-[18px] text-fg-muted">{stop.detail}</span>
                </span>
                <Icon
                  name="chevron-right"
                  size={16}
                  className="mt-0.5 shrink-0 text-fg-muted transition-transform duration-150 group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ol>
      </Panel>
    </>
  );
}
