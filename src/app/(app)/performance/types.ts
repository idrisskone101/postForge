import type { SocialProvider } from "@/lib/integrations-client";
import type { PublicIntegrationStatus } from "@/lib/integrations/types";
import type { PerformanceDataset } from "@/lib/performance/csv";
import type {
  ConnectedAccountView,
  PerformancePostView,
} from "@/lib/performance/metrics";

export type PerformanceMetricVariant = "youtube" | "default";

export type PerformancePostsView = "table" | "grid";

export type PerformanceRange = 7 | 30 | 90;

export type PerformanceSourceWorkspace = {
  statuses: PublicIntegrationStatus[];
  providers: ConnectedAccountView[];
  csvDataset: PerformanceDataset | null;
  selectedSource: string;
  selectable: boolean;
  busyProvider: SocialProvider | null;
  importing: boolean;
  syncAll: (() => void) | null;
  onSelect: (source: string) => void;
  onSync: (entry: ConnectedAccountView) => void;
  onImport: () => void;
  onClearCsv: () => void;
};

/** One row of the Sources panel. Each kind owns its trailing control. */
export type PerformanceSourceRow =
  | { kind: "unconfigured"; key: string; name: string }
  | { kind: "disconnected"; key: string; name: string }
  | { kind: "unavailable"; key: string; name: string }
  | { kind: "all-connected"; key: string; name: string; sub: string }
  | {
      kind: "account";
      key: string;
      name: string;
      sub: string;
      health: "synced" | "never" | "partial" | "failed" | "reconnect";
      entry: ConnectedAccountView;
    }
  | { kind: "csv"; key: string; name: string; sub: string }
  | { kind: "csv-missing"; key: string; name: string; sub: string };

export type PerformanceStatCell = {
  label: string;
  value: string;
  unavailable: boolean;
  /** `x / y` when only some posts report the metric. */
  coverage: string | null;
};

export type PerformanceChartSeries = {
  empty: boolean;
  /** SVG path in a 1000 x 150 box. */
  path: string;
  /** The most recent datum, in percent of the plot box. */
  current: { left: number; top: number } | null;
  yLabels: [string, string, string];
  xLabels: [string, string, string];
};

export type PerformancePostsModel = {
  posts: PerformancePostView[];
  view: PerformancePostsView;
  search: string;
  range: PerformanceRange;
  youtubeRawOnly: boolean;
  onSearch: (value: string) => void;
  onView: (view: PerformancePostsView) => void;
  onRange: (range: PerformanceRange) => void;
};
