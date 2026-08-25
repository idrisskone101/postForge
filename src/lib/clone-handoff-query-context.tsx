"use client";

import { createContext, useContext, type ReactNode } from "react";

export function CloneHandoffQueryProvider({
  query,
  children,
}: {
  query: string;
  children: ReactNode;
}) {
  return (
    <CloneHandoffQueryContext.Provider value={query}>
      {children}
    </CloneHandoffQueryContext.Provider>
  );
}

export function useCloneHandoffQuery() {
  return useContext(CloneHandoffQueryContext);
}

const CloneHandoffQueryContext = createContext("");
