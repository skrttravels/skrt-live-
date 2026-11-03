"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type HeaderContextType = {
  headerCenter: ReactNode | null;
  setHeaderCenter: (node: ReactNode | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
};

const HeaderContext = createContext<HeaderContextType>({
  headerCenter: null,
  setHeaderCenter: () => {},
  searchQuery: "",
  setSearchQuery: () => {},
});

export const useHeader = () => useContext(HeaderContext);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [headerCenter, setHeaderCenter] = useState<ReactNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  return (
    <HeaderContext.Provider value={{ headerCenter, setHeaderCenter, searchQuery, setSearchQuery }}>
      {children}
    </HeaderContext.Provider>
  );
}
