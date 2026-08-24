export default function CollectionsLoading() {
  return (
    <div className="space-y-4 px-5 py-6 sm:px-7">
      <div className="h-20 animate-pulse rounded-xl border border-[#DADBD2] bg-white" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-44 animate-pulse rounded-xl border border-[#DADBD2] bg-white"
          />
        ))}
      </div>
    </div>
  );
}
