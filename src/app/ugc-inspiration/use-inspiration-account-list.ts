"use client";

import { useState } from "react";
import type { InspirationAccountPage } from "@/lib/inspiration/types";
import {
  appendAccountPage,
  inspirationPageError,
  sortAccounts,
} from "./inspiration-models";
import { fetchInspirationAccountPage } from "./inspiration-mutations";

export function useInspirationAccountList(
  initialPage: InspirationAccountPage,
  setPageError: (message: string | null) => void
) {
  const [accounts, setAccounts] = useState(() => sortAccounts(initialPage.items));
  const [accountCursor, setAccountCursor] = useState(initialPage.nextCursor);
  const [isLoadingMoreAccounts, setIsLoadingMoreAccounts] = useState(false);

  async function handleLoadMoreAccounts() {
    if (!accountCursor || isLoadingMoreAccounts) return;

    setIsLoadingMoreAccounts(true);
    setPageError(null);
    try {
      const page = await fetchInspirationAccountPage({ cursor: accountCursor });
      setAccounts((current) => appendAccountPage(current, page.items));
      setAccountCursor(page.nextCursor);
    } catch (error) {
      setPageError(inspirationPageError(error, "Failed to load more creators."));
    } finally {
      setIsLoadingMoreAccounts(false);
    }
  }

  return {
    accounts,
    setAccounts,
    accountCursor,
    isLoadingMoreAccounts,
    handleLoadMoreAccounts,
  };
}
