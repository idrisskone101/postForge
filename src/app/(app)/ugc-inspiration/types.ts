import type {
  InspirationAccountPage,
  InspirationVideoPage,
} from "@/lib/inspiration/types";

export type InspirationPageClientProps = {
  initialAccountPage: InspirationAccountPage;
  initialVideoPage: InspirationVideoPage;
};

export type InspirationHeaderControlsProps = {
  handleInput: string;
  isAddingAccount: boolean;
  onHandleInputChange: (value: string) => void;
  onTrackAccount: () => void;
};

export type InspirationWorkspace = ReturnType<
  typeof import("./use-inspiration-workspace").useInspirationWorkspace
>;
