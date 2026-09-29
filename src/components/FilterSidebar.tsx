import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { FilterState } from '../types';
import { useDashboard } from '../context/DashboardContext';
import { Filter, X, Search, CheckSquare, Square } from 'lucide-react';

export const FilterSidebar: React.FC = () => {
  const { salesData, filters, setFilters } = useDashboard();
  const [customerSearch, setCustomerSearch] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 사용자가 검색어를 입력할 때마다 스크롤을 맨 아래로 부드럽게 이동
    if (customerSearch && scrollContainerRef.current) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 50);
    }
  }, [customerSearch]);

  // Extract unique values for filters
  const uniqueValues = useMemo(() => {
    const years = new Set<number>();
    const months = new Set<number>();
    const depart = new Set<string>();
    const budgets = new Set<string>();
    const custs = new Set<string>();
    const members = new Set<string>();

    salesData.forEach(r => {
      if (r.year) years.add(r.year);
      if (r.month && r.month > 0 && r.month <= 12) months.add(r.month);
      if (r.department) depart.add(r.department);
      if (r.budgetType) budgets.add(r.budgetType);
      if (r.customerName) custs.add(r.customerName);
      if (r.memberStatus) members.add(r.memberStatus);
    });

    return {
      years: Array.from(years).sort((a, b) => b - a),
      months: Array.from(months).sort((a, b) => a - b),
      departments: Array.from(depart).sort(),
      budgetTypes: Array.from(budgets).sort(),
      customers: Array.from(custs).sort(),
      memberStatuses: Array.from(members).sort((a, b: any) => {
        const order = ['대기업', '중소기업', '소기업', '단체', '비회원'];
        const indexA = order.indexOf(a);
        const indexB = order.indexOf(b);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      }),
    };
  }, [salesData]);

  const toggleFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => {
      const current = prev[key] as any[];
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter(v => v !== value) };
      } else {
        const next = [...current, value];
        // 연도인 경우 오름차순 정렬 유지
        if (key === 'years') next.sort((a, b) => a - b);
        return { ...prev, [key]: next };
      }
    });
  };

  const selectAll = (key: keyof FilterState, allValues: any[]) => {
    setFilters(prev => ({ ...prev, [key]: [...allValues] }));
  };

  const deselectAll = (key: keyof FilterState) => {
    setFilters(prev => ({ ...prev, [key]: [] }));
  };

  const setBooleanFilter = (key: 'ksCert' | 'isoCert', value: boolean | null) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      years: [], months: [], departments: [], budgetTypes: [], customers: [], ksCert: null, isoCert: null, memberStatuses: [], showTarget2026: true
    });
    setCustomerSearch('');
  };

  const activeFiltersCount = Object.values(filters).reduce((acc, val) => {
    if (Array.isArray(val)) return acc + val.length;
    if (val !== null) return acc + 1;
    return acc;
  }, 0);

  const renderCheckboxGroup = (title: string, items: any[], filterKey: keyof FilterState, searchable: boolean = false) => {
    if (items.length === 0) return null;
    
    // Determine displayed items (filtered by search if applicable)
    let displayItems = items;
    if (searchable && customerSearch.trim()) {
      displayItems = items.filter(item => String(item).toLowerCase().includes(customerSearch.toLowerCase()));
    }

    const currentSelection = filters[filterKey] as any[];

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 ml-1 pr-1">
          <h4 className="font-semibold text-slate-700 text-sm">{title}</h4>
          <div className="flex items-center space-x-2 text-xs text-indigo-600">
            <button onClick={() => selectAll(filterKey, items)} className="hover:text-indigo-800 transition-colors flex items-center" title="모두 선택">
              <CheckSquare className="w-3.5 h-3.5 mr-0.5" /> 전체
            </button>
            <button onClick={() => deselectAll(filterKey)} className="hover:text-indigo-800 transition-colors flex items-center" title="모두 해제">
              <Square className="w-3.5 h-3.5 mr-0.5" /> 해제
            </button>
          </div>
        </div>

        {searchable && (
          <div className="relative mb-2">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="고객명 검색..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="block w-full pl-7 pr-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}

        <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar pr-2">
          {displayItems.length === 0 && searchable && <div className="text-xs text-slate-400 p-1">검색 결과가 없습니다.</div>}
          {displayItems.map(item => {
            const isChecked = currentSelection.includes(item);
            return (
              <label key={String(item)} className="flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900 cursor-pointer p-1 rounded hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleFilter(filterKey, item)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors"
                />
                <span className="truncate" title={String(item)}>{item}{filterKey === 'months' ? '월' : filterKey === 'years' ? '년 실적' : ''}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-72 bg-white border-r border-slate-200 h-full flex flex-col shadow-sm">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center space-x-2 text-slate-800">
          <Filter className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold">데이터 필터</h3>
          {activeFiltersCount > 0 && (
            <span className="bg-indigo-100 text-indigo-700 text-xs py-0.5 px-2 rounded-full font-medium">
              {activeFiltersCount}
            </span>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-slate-400 hover:text-red-500 transition-colors bg-slate-100 p-1 rounded-md"
            title="필터 초기화"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50" ref={scrollContainerRef}>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3 ml-1 pr-1">
            <h4 className="font-semibold text-slate-700 text-sm">목표 데이터</h4>
          </div>
          <div className="space-y-1.5 pr-2">
            <label className="flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900 cursor-pointer p-1 rounded hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={filters.showTarget2026}
                onChange={(e) => setFilters(prev => ({ ...prev, showTarget2026: e.target.checked }))}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors"
              />
              <span className="truncate">2026년 목표 표시</span>
            </label>
          </div>
        </div>

        {renderCheckboxGroup("연도", uniqueValues.years, "years")}
        {renderCheckboxGroup("월", uniqueValues.months, "months")}
        {renderCheckboxGroup("사업부서명 (손익센터/이름)", uniqueValues.departments, "departments")}
        {renderCheckboxGroup("사업범주 / 예산(목)", uniqueValues.budgetTypes, "budgetTypes")}
        
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3 ml-1 pr-1">
            <h4 className="font-semibold text-slate-700 text-sm">인증 현황</h4>
            <div className="flex items-center space-x-2 text-xs text-indigo-600">
              <button 
                onClick={() => { setBooleanFilter('ksCert', null); setBooleanFilter('isoCert', null); }} 
                className="hover:text-indigo-800 transition-colors flex items-center" 
                title="모두 해제"
              >
                <Square className="w-3.5 h-3.5 mr-0.5" /> 전체 해제
              </button>
            </div>
          </div>
          <div className="space-y-4 px-1">
            <div>
              <span className="text-xs font-medium text-slate-500 block mb-1">KS 인증</span>
              <div className="flex bg-slate-100 rounded-lg p-1">
                {(['all', true, false] as const).map(val => (
                  <button
                    key={String(val)}
                    onClick={() => setBooleanFilter('ksCert', val === 'all' ? null : val)}
                    className={`flex-1 text-xs py-1.5 rounded-md transition-all font-medium ${(filters.ksCert === null && val === 'all') || filters.ksCert === val
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    {val === 'all' ? '무관' : val ? '인증 O' : '인증 X'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 block mb-1">ISO 인증</span>
              <div className="flex bg-slate-100 rounded-lg p-1">
                {(['all', true, false] as const).map(val => (
                  <button
                    key={String(val)}
                    onClick={() => setBooleanFilter('isoCert', val === 'all' ? null : val)}
                    className={`flex-1 text-xs py-1.5 rounded-md transition-all font-medium ${(filters.isoCert === null && val === 'all') || filters.isoCert === val
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    {val === 'all' ? '무관' : val ? '인증 O' : '인증 X'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {renderCheckboxGroup("회원 상태", uniqueValues.memberStatuses, "memberStatuses")}
        {renderCheckboxGroup("고객명", uniqueValues.customers, "customers", true)}
      </div>
    </div>
  );
};
