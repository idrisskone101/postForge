export default function AutomationsLoading() {
  return <div className="space-y-3 px-5 py-6 sm:px-7"><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-lg border border-border bg-card" />)}</div><div className="h-48 animate-pulse rounded-lg border border-border bg-card" /><div className="h-72 animate-pulse rounded-lg border border-border bg-card" /></div>;
}
