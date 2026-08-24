export function GenerateFormSkeleton() {
  return (
    <div data-generate-form="true" aria-hidden="true">
      <div data-generate-controls="true">
        <section data-generate-prompt="true" />
        <section data-generate-models="true" />
      </div>
      <aside />
    </div>
  );
}
