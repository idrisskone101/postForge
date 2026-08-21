export type CsvPostMetric = {
  id: string;
  title: string;
  views: number;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  publishedAt: string;
};

export type PerformanceDataset = {
  id: string;
  source: "csv";
  accountLabel: string;
  importedAt: string;
  posts: CsvPostMetric[];
};

function number(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  const multiplier = normalized.endsWith("k")
    ? 1_000
    : normalized.endsWith("m")
      ? 1_000_000
      : 1;
  const parsed = Number.parseFloat(normalized.replace(/[km,]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * multiplier) : null;
}

function parseCsvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (quoted) {
      if (character === '"') {
        if (csv[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

export function parsePerformanceCsv(csv: string): CsvPostMetric[] {
  const rows = parseCsvRows(csv.trim());
  if (rows.length < 2) throw new Error("The CSV needs a header and at least one post.");
  const headers = rows[0].map((value, index) =>
    (index === 0 ? value.replace(/^\uFEFF/, "") : value).trim().toLowerCase()
  );
  const required = ["title", "views", "publishedat"];
  if (!required.every((key) => headers.includes(key))) {
    throw new Error("Include title, views, and publishedAt columns.");
  }

  return rows.slice(1).map((cells, index) => {
    const get = (key: string) => cells[headers.indexOf(key)] ?? "";
    const optionalMetric = (key: string) => {
      const raw = get(key);
      if (!raw.trim()) return null;
      const parsed = number(raw);
      if (parsed === null || parsed < 0) {
        throw new Error(`Row ${index + 2} needs a non-negative numeric ${key} value.`);
      }
      return parsed;
    };
    const publishedAt = new Date(get("publishedat"));
    const views = number(get("views"));
    if (views === null || views < 0) {
      throw new Error(`Row ${index + 2} needs a non-negative numeric views value.`);
    }
    if (Number.isNaN(publishedAt.valueOf())) {
      throw new Error(`Row ${index + 2} needs a valid publishedAt date.`);
    }
    return {
      id: `metric_${Date.now()}_${index}`,
      title: get("title") || `Post ${index + 1}`,
      views,
      likes: optionalMetric("likes"),
      comments: optionalMetric("comments"),
      shares: optionalMetric("shares"),
      saves: optionalMetric("saves"),
      publishedAt: publishedAt.toISOString(),
    };
  });
}
