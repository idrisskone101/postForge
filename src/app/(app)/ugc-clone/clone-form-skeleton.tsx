export function CloneFormSkeleton() {
  return (
    <div data-clone-form-skeleton="true" aria-hidden="true">
      <div data-clone-production-state="true" />
    </div>
  );
}

export function CloneQueueSkeleton() {
  return <div data-clone-queue-skeleton="true" aria-hidden="true" />;
}
