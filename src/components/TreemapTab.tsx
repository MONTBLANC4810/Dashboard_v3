import React, { useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { Filter, Search, Calendar, CheckSquare, Square, X } from 'lucide-react';

interface SalesRecord {
  year: number;
  month: number;
  dateStr: string;
  department: string;
  budgetType: string;
  materialDetails?: string;
  customerName: string;
  salesAmount: number;
  ksCert: boolean;
  isoCert: boolean;
  memberStatus: string;
}

// ──────────────────────────────────────────────────────────────────
// ★ 대시보드 테마와 조화로운 트리맵 색상 (선명하고 모던한 톤 + 흰색 텍스트 가독성 확보)
// ──────────────────────────────────────────────────────────────────
const TREEMAP_COLORS = [
  '#6366f1', // indigo-500  (대시보드 메인 액센트)
  '#3b82f6', // blue-500
  '#0ea5e9', // sky-500
  '#14b8a6', // teal-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#ec4899', // pink-500
  '#f59e0b', // amber-500
  '#f97316', // orange-500
  '#a78bfa', // violet-400
  '#64748b'  // slate-500
];

// ──────────────────────────────────────────────────────────────────
// ★ Finviz 스타일 트리맵 커스텀 노드 렌더러
//   - 박스 면적에 맞게 폰트 크기 및 텍스트 행 수 동적 제어
//   - 은은한 파스텔 톤 색상 적용
//   - 그림자 및 가독성 향상 폰트 적용
//   - 노드 클릭 기능 탑재
// ──────────────────────────────────────────────────────────────────
function CustomTreemapNode(props: any) {
  const { x, y, width, height, name, amt, percent, index, onNodeClick } = props;
  
  // name이 없거나 크기가 너무 작으면 렌더링하지 않음 (Recharts Root 노드 등 예외 처리)
  if (!name || width < 35 || height < 20) return null;

  const safeIndex = index ?? 0;
  const safeAmt = amt ?? 0;
  const safePercent = percent ?? 0;

  // 은은한 파스텔 톤 색상 지정
  const baseColor = TREEMAP_COLORS[safeIndex % TREEMAP_COLORS.length];
  const fillOpacity = width > 120 && height > 80 ? 0.95 : 0.85;

  // 폰트 크기 동적 결정
  const nameFontSize = width > 100 ? 11 : 9;
  const valFontSize = width > 100 ? 10 : 8;

  return (
    <g onClick={() => onNodeClick && onNodeClick(name)} className="cursor-pointer">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        fill={baseColor}
        fillOpacity={fillOpacity}
        stroke="#ffffff"
        strokeWidth={1.5}
        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
      />
      {/* 텍스트 노출 (텍스트 그림자 및 500/600 굵기 적용하여 가독성 강화) */}
      {width > 50 && height > 25 && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (height > 45 ? 6 : 0)}
          fill="#ffffff"
          fontSize={nameFontSize}
          fontWeight={400}
          textAnchor="middle"
          dominantBaseline="middle"
          className="treemap-node-name"
          style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.45)', fontFamily: 'sans-serif', fill: '#ffffff' }}
        >
          {name.length > Math.floor(width / 10) ? name.slice(0, Math.floor(width / 10) - 1) + '..' : name}
        </text>
      )}
      
      {width > 90 && height > 55 && (
        <>
          {/* 금액 표시 */}
          <text
            x={x + width / 2}
            y={y + height / 2 + 8}
            fill="rgba(255,255,255,0.95)"
            fontSize={valFontSize}
            fontWeight={400}
            fontFamily="sans-serif"
            textAnchor="middle"
            dominantBaseline="middle"
            className="treemap-node-amount"
            style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.45)', fill: 'rgba(255,255,255,0.95)' }}
          >
            ₩{Math.round(safeAmt).toLocaleString()}
          </text>
          {/* 비중 % 표시 */}
          <text
            x={x + width / 2}
            y={y + height / 2 + 20}
            fill="rgba(255,255,255,0.85)"
            fontSize={valFontSize - 1}
            fontWeight={400}
            textAnchor="middle"
            dominantBaseline="middle"
            className="treemap-node-percent"
            style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.45)', fontFamily: 'sans-serif', fill: 'rgba(255,255,255,0.85)' }}
          >
            {safePercent.toFixed(1)}%
          </text>
        </>
      )}
    </g>
  );
}

export function TreemapTab() {
  const { salesData } = useDashboard();
  

  // 가용 연도 목록 추출
  const availableYears = useMemo(() => {
    const years = salesData.map(r => String(r.year));
    return Array.from(new Set(years)).sort();
  }, [salesData]);

  const monthsList = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

  // 2. 필터 및 기간 선택 상태 정의 (구간 2는 디폴트 '선택 안 함' 상태로 두어 1구간 전체 화면이 먼저 보이도록 함)
  const [period1, setPeriod1] = useState({ start: '2021-01', end: '2026-02' });
  const [period2, setPeriod2] = useState({ start: '', end: '' });

  // 구간 1 기간 변경 핸들러
  const handlePeriod1StartYearChange = (year: string) => {
    const month = period1.start.split('-')[1] || '01';
    const newYm = `${year}-${month}`;
    setPeriod1(prev => ({ ...prev, start: newYm, end: prev.end < newYm ? newYm : prev.end }));
  };
  const handlePeriod1StartMonthChange = (month: string) => {
    const year = period1.start.split('-')[0] || '2021';
    const newYm = `${year}-${month}`;
    setPeriod1(prev => ({ ...prev, start: newYm, end: prev.end < newYm ? newYm : prev.end }));
  };
  const handlePeriod1EndYearChange = (year: string) => {
    const month = period1.end.split('-')[1] || '12';
    const newYm = `${year}-${month}`;
    setPeriod1(prev => ({ ...prev, end: newYm, start: prev.start > newYm ? newYm : prev.start }));
  };
  const handlePeriod1EndMonthChange = (month: string) => {
    const year = period1.end.split('-')[0] || '2026';
    const newYm = `${year}-${month}`;
    setPeriod1(prev => ({ ...prev, end: newYm, start: prev.start > newYm ? newYm : prev.start }));
  };

  // 구간 2 기간 변경 핸들러 (선택 안 함 가능)
  const handlePeriod2StartYearChange = (year: string) => {
    if (!year) {
      setPeriod2({ start: '', end: '' });
      return;
    }
    const month = period2.start.split('-')[1] || '01';
    const newYm = `${year}-${month}`;
    setPeriod2(prev => {
      let newEnd = prev.end;
      if (!prev.end || prev.end < newYm) {
        newEnd = newYm;
      }
      return { start: newYm, end: newEnd };
    });
  };
  const handlePeriod2StartMonthChange = (month: string) => {
    const year = period2.start.split('-')[0] || availableYears[0] || '2021';
    const newYm = `${year}-${month}`;
    setPeriod2(prev => {
      let newEnd = prev.end;
      if (!prev.end || prev.end < newYm) {
        newEnd = newYm;
      }
      return { start: newYm, end: newEnd };
    });
  };
  const handlePeriod2EndYearChange = (year: string) => {
    if (!year) {
      setPeriod2({ start: '', end: '' });
      return;
    }
    const month = period2.end.split('-')[1] || '12';
    const newYm = `${year}-${month}`;
    setPeriod2(prev => {
      let newStart = prev.start;
      if (!prev.start || prev.start > newYm) {
        newStart = newYm;
      }
      return { start: newStart, end: newYm };
    });
  };
  const handlePeriod2EndMonthChange = (month: string) => {
    const year = period2.end.split('-')[0] || availableYears[availableYears.length - 1] || '2026';
    const newYm = `${year}-${month}`;
    setPeriod2(prev => {
      let newStart = prev.start;
      if (!prev.start || prev.start > newYm) {
        newStart = newYm;
      }
      return { start: newStart, end: newYm };
    });
  };
  
  // 사이드바 필터 고유 값 추출
  const uniqueValues = useMemo(() => {
    const depts = new Set<string>();
    const budgets = new Set<string>();
    const members = new Set<string>();
    const custs = new Set<string>();
    
    salesData.forEach(r => {
      if (r.department) depts.add(r.department);
      if (r.budgetType) budgets.add(r.budgetType);
      if (r.memberStatus) members.add(r.memberStatus);
      if (r.customerName) custs.add(r.customerName);
    });

    return {
      departments: Array.from(depts).sort(),
      budgetTypes: Array.from(budgets).sort(),
      memberStatuses: Array.from(members).sort((a, b: any) => {
        const order = ['대기업', '중소기업', '소기업', '단체', '비회원'];
        const indexA = order.indexOf(a);
        const indexB = order.indexOf(b);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      }),
      customers: Array.from(custs).sort()
    };
  }, [salesData]);

  // 로컬 필터 상태
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedBudgets, setSelectedBudgets] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [ksCertFilter, setKsCertFilter] = useState<boolean | null>(null); // null(무관), true(O), false(X)
  const [isoCertFilter, setIsoCertFilter] = useState<boolean | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [custSearch, setCustSearch] = useState('');

  // 클릭된 고객사에 대한 상세 보기 오버레이 팝업 상태 (각 구간별 독립)
  const [selectedCustomer1, setSelectedCustomer1] = useState<string | null>(null);
  const [selectedCustomer2, setSelectedCustomer2] = useState<string | null>(null);

  // 상세 보기 개수 제한 상태 (각 구간별 독립, 기본값 10)
  const [detailLimit1, setDetailLimit1] = useState<number>(10);
  const [detailLimit2, setDetailLimit2] = useState<number>(10);

  // 상세 보기 정렬 상태 (각 구간별 독립)
  const [sortKey1, setSortKey1] = useState<'period' | 'department' | 'salesAmount'>('salesAmount');
  const [sortDir1, setSortDir1] = useState<'asc' | 'desc'>('desc');
  const [sortKey2, setSortKey2] = useState<'period' | 'department' | 'salesAmount'>('salesAmount');
  const [sortDir2, setSortDir2] = useState<'asc' | 'desc'>('desc');

  // 필터 조건 만족 여부 확인
  const isRecordValid = (r: SalesRecord) => {
    if (selectedDepts.length > 0 && !selectedDepts.includes(r.department)) return false;
    if (selectedBudgets.length > 0 && !selectedBudgets.includes(r.budgetType)) return false;
    if (selectedMembers.length > 0 && !selectedMembers.includes(r.memberStatus)) return false;
    if (ksCertFilter !== null && r.ksCert !== ksCertFilter) return false;
    if (isoCertFilter !== null && r.isoCert !== isoCertFilter) return false;
    if (selectedCustomers.length > 0 && !selectedCustomers.includes(r.customerName)) return false;
    return true;
  };

  // 공통 조건 필터링된 SalesData
  const globallyFilteredSales = useMemo(() => {
    return salesData.filter(isRecordValid);
  }, [salesData, selectedDepts, selectedBudgets, selectedMembers, ksCertFilter, isoCertFilter, custSearch]);

  // 3. 각 구간별 트리맵 데이터 연산 (고객별 총매출액 집계, 음수 제외, Top 30 제한)
  //   - 방식 2 피드백 반영: 시작 또는 종료 연월 중 하나만 유효해도 1개월 단위 등으로 데이터 자동 연산
  const getTreemapData = (startStr: string, endStr: string) => {
    const start = startStr || endStr;
    const end = endStr || startStr;

    if (!start || !end) {
      return { data: [], totalRevenue: 0 };
    }

    // 날짜 기간 필터링
    const periodFiltered = globallyFilteredSales.filter((r) => {
      const ym = `${r.year}-${String(r.month).padStart(2, '0')}`;
      return ym >= start && ym <= end;
    });

    // 고객별 집계
    const custMap = new Map<string, number>();
    periodFiltered.forEach((r) => {
      custMap.set(r.customerName, (custMap.get(r.customerName) || 0) + r.salesAmount);
    });

    // 0 이하 금액 제외 및 가공
    const list = Array.from(custMap.entries())
      .filter(([_, amount]) => amount > 0)
      .map(([name, amount]) => ({
        name,
        amt: amount,
        size: amount // recharts treemap에서 면적 기준 변수로 사용
      }))
      .sort((a, b) => b.amt - a.amt);

    const totalRevenue = list.reduce((sum, item) => sum + item.amt, 0);

    // 비중 백분율 계산 및 Top 30 추출
    const top30 = list.slice(0, 30).map((item) => ({
      ...item,
      percent: totalRevenue > 0 ? (item.amt / totalRevenue) * 100 : 0
    }));

    return {
      data: top30,
      totalRevenue
    };
  };

  const treemap1 = useMemo(() => getTreemapData(period1.start, period1.end), [globallyFilteredSales, period1]);
  const treemap2 = useMemo(() => getTreemapData(period2.start, period2.end), [globallyFilteredSales, period2]);

  // 특정 고객사의 기간 내 매출 리스트 중 상위 N개 가공 헬퍼
  const getDetailedSales = (
    customerName: string,
    startStr: string,
    endStr: string,
    limit: number = 10,
    sortKey: 'period' | 'department' | 'salesAmount' = 'salesAmount',
    sortDir: 'asc' | 'desc' = 'desc'
  ) => {
    const start = startStr || endStr;
    const end = endStr || startStr;
    if (!customerName || !start || !end) return [];
    
    const matched = globallyFilteredSales.filter(r => {
      const ym = `${r.year}-${String(r.month).padStart(2, '0')}`;
      return ym >= start && ym <= end && r.customerName === customerName;
    });

    // 1단계: 매출액 기준으로 내림차순(desc) 정렬하여 상위 limit개 추출 (A안)
    const topN = [...matched].sort((a, b) => b.salesAmount - a.salesAmount).slice(0, limit);

    // 2단계: 추출된 topN 리스트에 대해 sortKey, sortDir 기준으로 정렬
    return topN.sort((a, b) => {
      let valA: any;
      let valB: any;
      
      if (sortKey === 'period') {
        valA = `${a.year}-${String(a.month).padStart(2, '0')}`;
        valB = `${b.year}-${String(b.month).padStart(2, '0')}`;
      } else if (sortKey === 'department') {
        valA = a.department || '';
        valB = b.department || '';
      } else {
        valA = a.salesAmount;
        valB = b.salesAmount;
      }
      
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // 정렬 핸들러 헬퍼 정의
  const handleSort1 = (key: 'period' | 'department' | 'salesAmount') => {
    if (sortKey1 === key) {
      setSortDir1(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey1(key);
      setSortDir1('desc');
    }
  };

  const handleSort2 = (key: 'period' | 'department' | 'salesAmount') => {
    if (sortKey2 === key) {
      setSortDir2(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey2(key);
      setSortDir2('desc');
    }
  };

  // 미니 화살표 기호 렌더링 헬퍼
  const getSortIcon = (key: 'period' | 'department' | 'salesAmount', sortKey: string, sortDir: string) => {
    if (sortKey !== key) return <span className="text-slate-300 ml-1 font-mono text-[9px] select-none">↕</span>;
    return sortDir === 'asc' 
      ? <span className="text-indigo-600 ml-1 font-mono text-[9px] select-none">▲</span> 
      : <span className="text-indigo-600 ml-1 font-mono text-[9px] select-none">▼</span>;
  };

  // 구간 2 활성화 여부 판별 (방식 2: 시작일 또는 종료일 둘 중 하나만 선택해도 활성화로 처리)
  const isPeriod2Active = period2.start !== '' || period2.end !== '';
  
  // 화면 표출용 구간 2 연월 텍스트
  const period2StartToShow = period2.start || period2.end;
  const period2EndToShow = period2.end || period2.start;

  // 다중 선택 유틸
  const toggleSelect = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setList(list.includes(item) ? list.filter(x => x !== item) : [...list, item]);
  };

  // 활성화된 필터 개수 계산
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    count += selectedDepts.length;
    count += selectedBudgets.length;
    count += selectedMembers.length;
    if (ksCertFilter !== null) count += 1;
    if (isoCertFilter !== null) count += 1;
    count += selectedCustomers.length;
    return count;
  }, [selectedDepts, selectedBudgets, selectedMembers, ksCertFilter, isoCertFilter, selectedCustomers]);

  const handleResetFilters = () => {
    setSelectedDepts([]);
    setSelectedBudgets([]);
    setSelectedMembers([]);
    setKsCertFilter(null);
    setIsoCertFilter(null);
    setSelectedCustomers([]);
    setCustSearch('');
  };

  // 사이드바의 체크박스 그룹 렌더러 (FilterSidebar.tsx 디자인 및 기능 복제)
  const renderSidebarCheckboxGroup = (
    title: string,
    items: string[],
    selectedItems: string[],
    setSelectedItems: React.Dispatch<React.SetStateAction<string[]>>,
    searchable: boolean = false
  ) => {
    if (items.length === 0) return null;

    let displayItems = items;
    if (searchable && custSearch.trim()) {
      displayItems = items.filter(item => item.toLowerCase().includes(custSearch.toLowerCase()));
    }

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 ml-1 pr-1">
          <h4 className="font-semibold text-slate-700 text-sm">{title}</h4>
          <div className="flex items-center space-x-2 text-xs text-indigo-600">
            <button
              onClick={() => setSelectedItems([...items])}
              className="hover:text-indigo-800 transition-colors flex items-center font-medium"
              title="모두 선택"
            >
              <CheckSquare className="w-3.5 h-3.5 mr-0.5" /> 전체
            </button>
            <button
              onClick={() => setSelectedItems([])}
              className="hover:text-indigo-800 transition-colors flex items-center font-medium"
              title="모두 해제"
            >
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
              value={custSearch}
              onChange={(e) => setCustSearch(e.target.value)}
              className="block w-full pl-7 pr-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}

        <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar pr-2">
          {displayItems.length === 0 && searchable && <div className="text-xs text-slate-400 p-1">검색 결과가 없습니다.</div>}
          {displayItems.map(item => {
            const isChecked = selectedItems.includes(item);
            return (
              <label
                key={item}
                className="flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900 cursor-pointer p-1 rounded hover:bg-slate-100 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleSelect(selectedItems, setSelectedItems, item)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors"
                />
                <span className="truncate" title={item}>{item}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full bg-slate-50 font-sans overflow-hidden">
      <style>{`
        text.treemap-node-name {
          fill: #ffffff !important;
        }
        text.treemap-node-amount {
          fill: rgba(255,255,255,0.95) !important;
        }
        text.treemap-node-percent {
          fill: rgba(255,255,255,0.85) !important;
        }
        .recharts-default-tooltip,
        .recharts-default-tooltip * {
          color: #ffffff !important;
        }
      `}</style>
      {/* ── 좌측 필터 사이드바 (FilterSidebar.tsx 디자인 100% 동기화 및 마우스 스크롤 교정) ── */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm shrink-0 h-full overflow-hidden">
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
              onClick={handleResetFilters}
              className="text-slate-400 hover:text-red-500 transition-colors bg-slate-100 p-1 rounded-md"
              title="필터 초기화"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0 bg-slate-50/50 custom-scrollbar pr-2">
          {/* 사업부서명 */}
          {renderSidebarCheckboxGroup("사업부서명", uniqueValues.departments, selectedDepts, setSelectedDepts)}

          {/* 예산 (목) */}
          {renderSidebarCheckboxGroup("사업범주 / 예산(목)", uniqueValues.budgetTypes, selectedBudgets, setSelectedBudgets)}

          {/* 인증 현황 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 ml-1 pr-1">
              <h4 className="font-semibold text-slate-700 text-sm">인증 현황</h4>
              <div className="flex items-center space-x-2 text-xs text-indigo-600">
                <button 
                  onClick={() => { setKsCertFilter(null); setIsoCertFilter(null); }} 
                  className="hover:text-indigo-800 transition-colors flex items-center font-medium" 
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
                  {([null, true, false] as const).map(val => (
                    <button
                      key={String(val)}
                      onClick={() => setKsCertFilter(val)}
                      className={`flex-1 text-xs py-1.5 rounded-md transition-all font-medium ${
                        ksCertFilter === val
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {val === null ? '무관' : val ? '인증 O' : '인증 X'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">ISO 인증</span>
                <div className="flex bg-slate-100 rounded-lg p-1">
                  {([null, true, false] as const).map(val => (
                    <button
                      key={String(val)}
                      onClick={() => setIsoCertFilter(val)}
                      className={`flex-1 text-xs py-1.5 rounded-md transition-all font-medium ${
                        isoCertFilter === val
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {val === null ? '무관' : val ? '인증 O' : '인증 X'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 회원 상태 */}
          {renderSidebarCheckboxGroup("회원 상태", uniqueValues.memberStatuses, selectedMembers, setSelectedMembers)}

          {/* 고객명 다중 선택 필터 */}
          {renderSidebarCheckboxGroup("고객명", uniqueValues.customers, selectedCustomers, setSelectedCustomers, true)}
        </div>
      </aside>

      {/* ── 우측 트리맵 콘텐츠 영역 ── */}
      <section className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto custom-scrollbar">
        {/* 기간 선택 패널 (WidgetWrapper 스타일 적용) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row gap-6 items-center justify-start shrink-0 w-full">
          <div className="flex items-center gap-2 shrink-0">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h4 className="font-bold text-slate-800 text-sm">비교 구간 기간 설정</h4>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
            {/* 구간 1 기간 선택 */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 hover:bg-slate-100 p-1.5 px-3 rounded-lg text-xs transition-colors shrink-0">
              <span className="font-bold text-indigo-600 mr-1.5 shrink-0">구간 1</span>
              {/* 시작 연도 */}
              <select
                value={period1.start.split('-')[0]}
                onChange={(e) => handlePeriod1StartYearChange(e.target.value)}
                className="bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 font-semibold cursor-pointer py-0.5 pr-5 text-xs"
              >
                {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
              {/* 시작 월 */}
              <select
                value={period1.start.split('-')[1]}
                onChange={(e) => handlePeriod1StartMonthChange(e.target.value)}
                className="bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 font-semibold cursor-pointer py-0.5 pr-5 text-xs"
              >
                {monthsList.map(m => <option key={m} value={m}>{parseInt(m)}월</option>)}
              </select>
              <span className="text-slate-400 font-medium px-0.5">~</span>
              {/* 종료 연도 */}
              <select
                value={period1.end.split('-')[0]}
                onChange={(e) => handlePeriod1EndYearChange(e.target.value)}
                className="bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 font-semibold cursor-pointer py-0.5 pr-5 text-xs"
              >
                {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
              {/* 종료 월 */}
              <select
                value={period1.end.split('-')[1]}
                onChange={(e) => handlePeriod1EndMonthChange(e.target.value)}
                className="bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 font-semibold cursor-pointer py-0.5 pr-5 text-xs"
              >
                {monthsList.map(m => <option key={m} value={m}>{parseInt(m)}월</option>)}
              </select>
            </div>

            {/* 구간 2 기간 선택 */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 hover:bg-slate-100 p-1.5 px-3 rounded-lg text-xs transition-colors shrink-0">
              <span className="font-bold text-emerald-600 mr-1.5 shrink-0">구간 2</span>
              {/* 시작 연도 */}
              <select
                value={period2.start ? period2.start.split('-')[0] : ''}
                onChange={(e) => handlePeriod2StartYearChange(e.target.value)}
                className="bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 font-semibold cursor-pointer py-0.5 pr-5 text-xs"
              >
                <option value="">[선택 안 함]</option>
                {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
              {/* 시작 월 */}
              <select
                value={period2.start ? period2.start.split('-')[1] : ''}
                disabled={!period2.start}
                onChange={(e) => handlePeriod2StartMonthChange(e.target.value)}
                className="bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 font-semibold cursor-pointer py-0.5 pr-5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="">-</option>
                {monthsList.map(m => <option key={m} value={m}>{parseInt(m)}월</option>)}
              </select>
              <span className="text-slate-400 font-medium px-0.5">~</span>
              {/* 종료 연도 */}
              <select
                value={period2.end ? period2.end.split('-')[0] : ''}
                disabled={!period2.start}
                onChange={(e) => handlePeriod2EndYearChange(e.target.value)}
                className="bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 font-semibold cursor-pointer py-0.5 pr-5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="">[선택 안 함]</option>
                {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
              {/* 종료 월 */}
              <select
                value={period2.end ? period2.end.split('-')[1] : ''}
                disabled={!period2.start}
                onChange={(e) => handlePeriod2EndMonthChange(e.target.value)}
                className="bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 font-semibold cursor-pointer py-0.5 pr-5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="">-</option>
                {monthsList.map(m => <option key={m} value={m}>{parseInt(m)}월</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 트리맵 배치 그리드 (flex-row를 사용하여 항상 가로 50:50 좌우 1:1 배치 강제, 쏠림 해결) */}
        <div className="flex flex-row gap-6 flex-1 min-h-[480px] w-full">
          {/* 구간 1 트리맵 (isPeriod2Active 상태에 따라 flex-1 w-1/2 min-w-0 또는 w-full flex-grow 동적 확장) */}
          <div className={`bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full relative overflow-hidden ${
            isPeriod2Active ? 'flex-grow flex-1 w-1/2 min-w-0' : 'w-full flex-grow flex-1 min-w-0'
          }`}>
            {/* 개선된 카드 헤더: 여백을 넓히고(p-6 pb-4) w-full justify-between으로 정렬 */}
            <div className="pt-4 px-6 pb-2 shrink-0">
              <div className="flex items-center justify-between gap-4 w-full">
                <div className="flex items-center gap-2">
                  <h5 className="font-bold text-slate-800 text-sm">
                    구간 1 매출 비중
                  </h5>
                  <span className="font-normal text-slate-500 text-xs font-mono">({period1.start} ~ {period1.end})</span>
                </div>
                <div className="flex items-center gap-2 text-xs shrink-0">
                  <span className="text-slate-400 font-medium">총 매출액</span>
                  <span className="font-extrabold text-indigo-600 font-mono text-sm">
                    ₩{Math.round(treemap1.totalRevenue).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            {/* 왼쪽부터 오른쪽까지 긋는 금(경계선) */}
            <div className="border-b border-slate-200/80 w-full shrink-0" />

            {/* 카드 바디 */}
            <div className="flex-1 px-6 pb-4 pt-1 min-h-[400px]">
              {treemap1.data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={treemap1.data}
                    dataKey="size"
                    stroke="#ffffff"
                    isAnimationActive={false} // 유입 애니메이션 제거
                    content={<CustomTreemapNode onNodeClick={(name: string) => { setSelectedCustomer1(name); setDetailLimit1(10); setSortKey1('salesAmount'); setSortDir1('desc'); }} />}
                  >
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        `₩${Math.round(value).toLocaleString()}`,
                        `고객명: ${name}`
                      ]}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '11px',
                        padding: '8px'
                      }}
                      itemStyle={{ color: '#ffffff' }}
                      labelStyle={{ color: '#ffffff' }}
                    />
                  </Treemap>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  조건을 충족하는 매출 데이터가 없습니다.
                </div>
              )}
            </div>

            {/* 구간 1 실적 상세 오버레이 팝업 */}
            {selectedCustomer1 && (
              <div className="absolute inset-0 bg-white shadow-2xl z-20 rounded-xl overflow-hidden flex flex-col p-4 animate-fade-in">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">{selectedCustomer1} 실적 상세 (구간 1)</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">상위 {detailLimit1}개 매출 거래 내역</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* 똥그란 원형 라디오 버튼 보기 개수 필터 */}
                    <div className="flex items-center space-x-3 text-xs bg-slate-50 border border-slate-200/60 p-1 px-2.5 rounded-lg">
                      <span className="text-slate-500 font-medium select-none">보기 개수:</span>
                      {([10, 20, 30] as const).map((val) => (
                        <label key={val} className="flex items-center space-x-1 cursor-pointer text-slate-600 hover:text-slate-900 font-semibold select-none">
                          <input
                            type="radio"
                            name="detailLimit1"
                            value={val}
                            checked={detailLimit1 === val}
                            onChange={() => setDetailLimit1(val)}
                            className="w-3 h-3 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                          />
                          <span>{val}개</span>
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={() => { setSelectedCustomer1(null); setDetailLimit1(10); setSortKey1('salesAmount'); setSortDir1('desc'); }}
                      className="text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors px-2 py-1 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100"
                    >
                      닫기 ✕
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 min-h-0 custom-scrollbar mt-3">
                  <table className="w-full text-xs text-left table-fixed">
                    <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                      <tr>
                        <th 
                          onClick={() => handleSort1('period')}
                          className="px-3 py-2 font-semibold text-slate-600 border-b border-slate-200 w-[25%] cursor-pointer hover:bg-slate-100 transition-colors select-none"
                        >
                          <div className="flex items-center">
                            시기 {getSortIcon('period', sortKey1, sortDir1)}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort1('department')}
                          className="px-3 py-2 font-semibold text-slate-600 border-b border-slate-200 w-[25%] cursor-pointer hover:bg-slate-100 transition-colors select-none"
                        >
                          <div className="flex items-center">
                            사업부서명 {getSortIcon('department', sortKey1, sortDir1)}
                          </div>
                        </th>
                        <th className="px-3 py-2 font-semibold text-slate-600 border-b border-slate-200 w-[30%] select-none">대표 사업코드명 / 자재내역</th>
                        <th 
                          onClick={() => handleSort1('salesAmount')}
                          className="px-3 py-2 font-semibold text-slate-600 text-right border-b border-slate-200 w-[20%] cursor-pointer hover:bg-slate-100 transition-colors select-none"
                        >
                          <div className="flex items-center justify-end">
                            매출계 / 매출액 {getSortIcon('salesAmount', sortKey1, sortDir1)}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getDetailedSales(selectedCustomer1, period1.start, period1.end, detailLimit1, sortKey1, sortDir1).map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 text-slate-700 truncate" title={`${r.year}년 ${String(r.month).padStart(2, '0')}월`}>
                            {r.year}년 {String(r.month).padStart(2, '0')}월
                          </td>
                          <td className="px-3 py-2 text-slate-700 truncate" title={r.department}>{r.department || '-'}</td>
                          <td className="px-3 py-2 text-slate-500 truncate" title={r.materialDetails}>{r.materialDetails || '-'}</td>
                          <td className="px-3 py-2 text-right text-slate-800 font-semibold font-mono">
                            ₩{Math.round(r.salesAmount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 구간 2 트리맵 (활성화되었을 때만 렌더링, flex-grow w-1/2 min-w-0 적용으로 좌우 대칭 화면 확장) */}
          {isPeriod2Active && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full relative overflow-hidden flex-grow flex-1 w-1/2 min-w-0">
              {/* 개선된 카드 헤더: 여백을 넓히고(p-6 pb-4) w-full justify-between으로 정렬 */}
              <div className="pt-4 px-6 pb-2 shrink-0">
                <div className="flex items-center justify-between gap-4 w-full">
                  <div className="flex items-center gap-2">
                    <h5 className="font-bold text-slate-800 text-sm">
                      구간 2 매출 비중
                    </h5>
                    <span className="font-normal text-slate-500 text-xs font-mono">({period2StartToShow} ~ {period2EndToShow})</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs shrink-0">
                    <span className="text-slate-400 font-medium">총 매출액</span>
                    <span className="font-extrabold text-emerald-600 font-mono text-sm">
                      ₩{Math.round(treemap2.totalRevenue).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              {/* 왼쪽부터 오른쪽까지 긋는 금(경계선) */}
              <div className="border-b border-slate-200/80 w-full shrink-0" />

              {/* 카드 바디 */}
              <div className="flex-1 px-6 pb-4 pt-1 min-h-[400px]">
                {treemap2.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={treemap2.data}
                      dataKey="size"
                      stroke="#ffffff"
                      isAnimationActive={false} // 유입 애니메이션 제거
                      content={<CustomTreemapNode onNodeClick={(name: string) => { setSelectedCustomer2(name); setDetailLimit2(10); setSortKey2('salesAmount'); setSortDir2('desc'); }} />}
                    >
                      <Tooltip
                        formatter={(value: any, name: any) => [
                          `₩${Math.round(value).toLocaleString()}`,
                          `고객명: ${name}`
                        ]}
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '11px',
                          padding: '8px'
                        }}
                        itemStyle={{ color: '#ffffff' }}
                        labelStyle={{ color: '#ffffff' }}
                      />
                    </Treemap>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    조건을 충족하는 매출 데이터가 없습니다.
                  </div>
                )}
              </div>

              {/* 구간 2 실적 상세 오버레이 팝업 */}
              {selectedCustomer2 && (
                <div className="absolute inset-0 bg-white shadow-2xl z-20 rounded-xl overflow-hidden flex flex-col p-4 animate-fade-in">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{selectedCustomer2} 실적 상세 (구간 2)</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">상위 {detailLimit2}개 매출 거래 내역</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* 똥그란 원형 라디오 버튼 보기 개수 필터 */}
                      <div className="flex items-center space-x-3 text-xs bg-slate-50 border border-slate-200/60 p-1 px-2.5 rounded-lg">
                        <span className="text-slate-500 font-medium select-none">보기 개수:</span>
                        {([10, 20, 30] as const).map((val) => (
                          <label key={val} className="flex items-center space-x-1 cursor-pointer text-slate-600 hover:text-slate-900 font-semibold select-none">
                            <input
                              type="radio"
                              name="detailLimit2"
                              value={val}
                              checked={detailLimit2 === val}
                              onChange={() => setDetailLimit2(val)}
                              className="w-3 h-3 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                            />
                            <span>{val}개</span>
                          </label>
                        ))}
                      </div>
                      <button
                        onClick={() => { setSelectedCustomer2(null); setDetailLimit2(10); setSortKey2('salesAmount'); setSortDir2('desc'); }}
                        className="text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors px-2 py-1 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100"
                      >
                        닫기 ✕
                      </button>
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 min-h-0 custom-scrollbar mt-3">
                    <table className="w-full text-xs text-left table-fixed">
                      <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                        <tr>
                          <th 
                            onClick={() => handleSort2('period')}
                            className="px-3 py-2 font-semibold text-slate-600 border-b border-slate-200 w-[25%] cursor-pointer hover:bg-slate-100 transition-colors select-none"
                          >
                            <div className="flex items-center">
                              시기 {getSortIcon('period', sortKey2, sortDir2)}
                            </div>
                          </th>
                          <th 
                            onClick={() => handleSort2('department')}
                            className="px-3 py-2 font-semibold text-slate-600 border-b border-slate-200 w-[25%] cursor-pointer hover:bg-slate-100 transition-colors select-none"
                          >
                            <div className="flex items-center">
                              사업부서명 {getSortIcon('department', sortKey2, sortDir2)}
                            </div>
                          </th>
                          <th className="px-3 py-2 font-semibold text-slate-600 border-b border-slate-200 w-[30%] select-none">대표 사업코드명 / 자재내역</th>
                          <th 
                            onClick={() => handleSort2('salesAmount')}
                            className="px-3 py-2 font-semibold text-slate-600 text-right border-b border-slate-200 w-[20%] cursor-pointer hover:bg-slate-100 transition-colors select-none"
                          >
                            <div className="flex items-center justify-end">
                              매출계 / 매출액 {getSortIcon('salesAmount', sortKey2, sortDir2)}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {getDetailedSales(selectedCustomer2, period2.start, period2.end, detailLimit2, sortKey2, sortDir2).map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2 text-slate-700 truncate" title={`${r.year}년 ${String(r.month).padStart(2, '0')}월`}>
                              {r.year}년 {String(r.month).padStart(2, '0')}월
                            </td>
                            <td className="px-3 py-2 text-slate-700 truncate" title={r.department}>{r.department || '-'}</td>
                            <td className="px-3 py-2 text-slate-500 truncate" title={r.materialDetails}>{r.materialDetails || '-'}</td>
                            <td className="px-3 py-2 text-right text-slate-800 font-semibold font-mono">
                              ₩{Math.round(r.salesAmount).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
