export function AutomationBuilderSkeleton() {
  return (
    <div data-automation-builder="true" aria-hidden="true">
      <header />
      <div data-automation-phases="true" />
      <section data-automation-workspace="true">
        <aside data-automation-form="true" />
        <div data-automation-preview="true" />
      </section>
      <div data-automation-overlay="true">
        <div data-automation-dialog="true">
          <h2 data-playbook-title="Choose a playbook">
            <span className="sr-only">Choose a playbook</span>
          </h2>
        </div>
      </div>
    </div>
  );
}
