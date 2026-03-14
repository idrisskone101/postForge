export function formatRelativeDate(date: string | Date): string {
  const now = new Date();
  const d = date instanceof Date ? date : new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return "just now";
  }

  if (diffMin < 60) {
    return diffMin === 1 ? "1 min ago" : `${diffMin} min ago`;
  }

  if (diffHour < 24) {
    return diffHour === 1 ? "1 hour ago" : `${diffHour} hours ago`;
  }

  if (diffDay === 1) {
    return "yesterday";
  }

  if (diffDay < 7) {
    return `${diffDay} days ago`;
  }

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
