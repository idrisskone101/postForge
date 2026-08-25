import type { TrackedInspirationAccount } from "@/lib/inspiration/types";
import {
  inspirationPageError,
  markAccountSyncError,
  markAccountSyncing,
  mergeAccountIntoState,
  withId,
  withoutId,
} from "./inspiration-models";
import {
  deleteInspirationAccount,
  refreshInspirationAccount,
  trackInspirationAccount,
} from "./inspiration-mutations";

type AccountListSetter = (
  updater: (current: TrackedInspirationAccount[]) => TrackedInspirationAccount[]
) => void;

type IdListSetter = (updater: (current: string[]) => string[]) => void;

export async function trackWorkspaceAccount(options: {
  handle: string;
  setHandleInput: (value: string) => void;
  setIsAddingAccount: (value: boolean) => void;
  setPageError: (message: string | null) => void;
  setAccounts: AccountListSetter;
  replaceVideoPage: () => Promise<void>;
}): Promise<void> {
  if (!options.handle.trim()) return;

  options.setIsAddingAccount(true);
  options.setPageError(null);

  try {
    const account = await trackInspirationAccount(options.handle.trim());
    options.setAccounts((current) => mergeAccountIntoState(current, account));
    options.setHandleInput("");
    await options.replaceVideoPage();
  } catch (error) {
    options.setPageError(inspirationPageError(error, "Failed to track creator."));
  } finally {
    options.setIsAddingAccount(false);
  }
}

export async function refreshWorkspaceAccount(options: {
  accountId: string;
  setRefreshingIds: IdListSetter;
  setAccounts: AccountListSetter;
  setPageError: (message: string | null) => void;
  replaceVideoPage: () => Promise<void>;
}): Promise<void> {
  const attemptAt = new Date().toISOString();
  options.setRefreshingIds((current) => withId(current, options.accountId));
  options.setAccounts((current) =>
    markAccountSyncing(current, options.accountId, attemptAt)
  );

  try {
    const refreshed = await refreshInspirationAccount(options.accountId);
    options.setAccounts((current) => mergeAccountIntoState(current, refreshed));
    await options.replaceVideoPage();
  } catch (error) {
    const message = inspirationPageError(error, "Failed to refresh creator.");
    options.setPageError(message);
    options.setAccounts((current) =>
      markAccountSyncError(current, options.accountId, attemptAt, message)
    );
  } finally {
    options.setRefreshingIds((current) => withoutId(current, options.accountId));
  }
}

export async function deleteWorkspaceAccount(options: {
  account: TrackedInspirationAccount;
  selectedVideoAccountId: string | undefined;
  activeFilter: "all" | string;
  setDeletingIds: IdListSetter;
  setAccounts: AccountListSetter;
  setPageError: (message: string | null) => void;
  setSelectedVideoId: (id: string | null) => void;
  setActiveFilterAndReload: (filter: "all" | string) => void;
  replaceVideoPage: () => Promise<void>;
}): Promise<void> {
  if (
    !window.confirm(`Remove ${options.account.handleDisplay} from Inspiration?`)
  ) {
    return;
  }

  options.setDeletingIds((current) => withId(current, options.account.id));
  options.setPageError(null);

  try {
    await deleteInspirationAccount(options.account.id);
    options.setAccounts((current) =>
      current.filter((item) => item.id !== options.account.id)
    );
    if (options.selectedVideoAccountId === options.account.id) {
      options.setSelectedVideoId(null);
    }
    if (options.activeFilter === options.account.id) {
      options.setActiveFilterAndReload("all");
    } else {
      await options.replaceVideoPage();
    }
  } catch (error) {
    options.setPageError(inspirationPageError(error, "Failed to remove creator."));
  } finally {
    options.setDeletingIds((current) => withoutId(current, options.account.id));
  }
}
