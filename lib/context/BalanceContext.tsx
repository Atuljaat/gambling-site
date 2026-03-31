"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface BalanceContextType {
  balance: number;
  setBalance: (balance: number) => void;
  updateBalance: (amount: number) => void;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children, initialBalance = 1000 }: { children: ReactNode, initialBalance?: number }) {
  const [balance, setBalance] = useState<number>(initialBalance);

  const updateBalance = (amount: number) => {
    setBalance((prev) => prev + amount);
  };

  return (
    <BalanceContext.Provider value={{ balance, setBalance, updateBalance }}>
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error("useBalance must be used within a BalanceProvider");
  }
  return context;
}
