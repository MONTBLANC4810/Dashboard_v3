import React, { createContext, useContext, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { SalesRecord, TargetRecord, FilterState } from '../types';
import { target2026 } from '../data/target2026';

interface DashboardContextType {
  salesData: SalesRecord[];
  targetData: TargetRecord[];
  filteredSales: SalesRecord[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  updateData: (sales: SalesRecord[], targets: TargetRecord[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isInitialLoad: boolean;
  resetFilters: () => void;
}

export const initialFilters: FilterState = {
  years: [],
  months: [],
  departments: [],
  budgetTypes: [],
  customers: [],
  ksCert: null,
  isoCert: null,
  memberStatuses: [],
  showTarget2026: true,
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [salesData, setSalesData] = useState<SalesRecord[]>([]);
  const [targetData, setTargetData] = useState<TargetRecord[]>(target2026);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const updateData = (sales: SalesRecord[], targets: TargetRecord[]) => {
    setSalesData(sales);
    if (targets && targets.length > 0) {
      setTargetData(targets);
    } else {
      setTargetData(target2026);
    }
    setIsInitialLoad(false);
  };

  const filteredSales = useMemo(() => {
    return salesData.filter(record => {
      if (filters.years.length > 0 && !filters.years.includes(record.year)) return false;
      if (filters.months.length > 0 && !filters.months.includes(record.month)) return false;
      if (filters.departments.length > 0 && !filters.departments.includes(record.department)) return false;
      if (filters.budgetTypes.length > 0 && !filters.budgetTypes.includes(record.budgetType)) return false;
      if (filters.customers.length > 0 && !filters.customers.includes(record.customerName)) return false;
      if (filters.ksCert !== null && record.ksCert !== filters.ksCert) return false;
      if (filters.isoCert !== null && record.isoCert !== filters.isoCert) return false;
      if (filters.memberStatuses.length > 0 && !filters.memberStatuses.includes(record.memberStatus)) return false;
      return true;
    });
  }, [salesData, filters]);

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  return (
    <DashboardContext.Provider value={{
      salesData, targetData, filteredSales, filters, setFilters, updateData, isLoading, setIsLoading, isInitialLoad, resetFilters
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
