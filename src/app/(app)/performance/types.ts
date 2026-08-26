import type { SocialProvider } from "@/lib/integrations-client";
import type { PerformanceDataset } from "@/lib/performance/csv";
import type {
  ConnectedAccountView,
  PerformancePostView,
} from "@/lib/performance/metrics";

export type PerformanceMetricVariant = "youtube" | "default";

export type PerformancePostsView = "table" | "grid";

export type PerformanceSourceWorkspace = {
  providers: ConnectedAccountView[];
  csvDataset: PerformanceDataset | null;
  selectedSource: string;
  busyProvider: SocialProvider | null;
  lastUpdatedAt: string | null;
  onSelect: (source: string) => void;
  onSync: (entry: ConnectedAccountView) => void;
  onImport: () => void;
  onClearCsv: () => void;
};

export type PerformanceStatCell = {
  label: string;
  value: string;
  detail: string;
  unavailable: boolean;
};

export type PerformanceChartMarker = {
  postId: string;
  x: number;
  y: number;
};

export type PerformanceChartSeries = {
  empty: boolean;
  polylinePoints: string;
  markers: PerformanceChartMarker[];
  domainStartLabel: string;
  domainEndLabel: string;
};

export type PerformanceSourceHeading = {
  title: string;
  subtitle: string;
};

export type PerformancePostsModel = {
  posts: PerformancePostView[];
  view: PerformancePostsView;
  search: string;
  youtubeRawOnly: boolean;
  tableFrameClassName: string;
  onSearch: (value: string) => void;
  onView: (view: PerformancePostsView) => void;
};
