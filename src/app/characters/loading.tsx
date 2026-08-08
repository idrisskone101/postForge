export default function CharactersLoading() {
  return <div className="grid gap-3 px-5 py-6 sm:grid-cols-2 sm:px-7 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-lg border border-border bg-card" />)}</div>;
}
