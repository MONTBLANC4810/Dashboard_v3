import { useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { formatKRW, formatPercent } from '../utils/format';
import { Building2, BookOpen, AlertTriangle, ShieldCheck, ArrowRightLeft, Sparkles, Search, Filter, HelpCircle } from 'lucide-react';

export function ConsultingTab() {
  const { salesData } = useDashboard();

  // 사용 가능한 연도 목록 추출
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(salesData.map(r => r.year))).sort((a, b) => b - a);
    return years.length > 0 ? years : [2026, 2025, 2024];
  }, [salesData]);

  // 기간 1 상태 설정 (기본값: 작년)
  const [p1StartYear, setP1StartYear] = useState<number>(availableYears[1] || 2025);
  const [p1StartMonth, setP1StartMonth] = useState<number>(1);
  const [p1EndYear, setP1EndYear] = useState<number>(availableYears[1] || 2025);
  const [p1EndMonth, setP1EndMonth] = useState<number>(12);

  // 기간 2 상태 설정 (기본값: 올해)
  const [p2StartYear, setP2StartYear] = useState<number>(availableYears[0] || 2026);
  const [p2StartMonth, setP2StartMonth] = useState<number>(1);
  const [p2EndYear, setP2EndYear] = useState<number>(availableYears[0] || 2026);
  const [p2EndMonth, setP2EndMonth] = useState<number>(12);

  // 검색, 제안 유형 필터 및 설비윤활기술 제외 토글 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'inhouse' | 'ojt' | 'iso'>('all');
  const [excludeLubrication, setExcludeLubrication] = useState(true); // 기본값: 제외 활성화

  // 기간별 필터 함수
  const getPeriodData = (startYear: number, startMonth: number, endYear: number, endMonth: number) => {
    return salesData.filter(r => {
      const recordVal = r.year * 100 + r.month;
      const startVal = startYear * 100 + startMonth;
      const endVal = endYear * 100 + endMonth;
      return recordVal >= startVal && recordVal <= endVal;
    });
  };

  // 1. 기간 비교 및 브리핑 생성 로직
  const briefingReport = useMemo(() => {
    const data1 = getPeriodData(p1StartYear, p1StartMonth, p1EndYear, p1EndMonth);
    const data2 = getPeriodData(p2StartYear, p2StartMonth, p2EndYear, p2EndMonth);

    const rev1 = data1.reduce((sum, r) => sum + r.salesAmount, 0);
    const rev2 = data2.reduce((sum, r) => sum + r.salesAmount, 0);
    const diff = rev2 - rev1;
    const rate = rev1 > 0 ? (diff / rev1) * 100 : 0;

    // 부서별 매출 합산 및 증감액 계산
    const deptMap1: Record<string, number> = {};
    const deptMap2: Record<string, number> = {};
    data1.forEach(r => deptMap1[r.department] = (deptMap1[r.department] || 0) + r.salesAmount);
    data2.forEach(r => deptMap2[r.department] = (deptMap2[r.department] || 0) + r.salesAmount);

    const depts = Array.from(new Set([...Object.keys(deptMap1), ...Object.keys(deptMap2)]));
    const deptDiffs = depts.map(name => {
      const v1 = deptMap1[name] || 0;
      const v2 = deptMap2[name] || 0;
      return { name, diff: v2 - v1, v1, v2 };
    }).sort((a, b) => b.diff - a.diff);

    const topDept = deptDiffs[0]; // 매출 증가 1위 부서
    const worstDept = deptDiffs[deptDiffs.length - 1]; // 매출 감소 1위 부서

    // 고객사별 매출 합산 및 증감액 계산
    const custMap1: Record<string, number> = {};
    const custMap2: Record<string, number> = {};
    data1.forEach(r => custMap1[r.customerName] = (custMap1[r.customerName] || 0) + r.salesAmount);
    data2.forEach(r => custMap2[r.customerName] = (custMap2[r.customerName] || 0) + r.salesAmount);

    const customers = Array.from(new Set([...Object.keys(custMap1), ...Object.keys(custMap2)]));
    const custDiffs = customers.map(name => {
      const v1 = custMap1[name] || 0;
      const v2 = custMap2[name] || 0;
      return { name, diff: v2 - v1, v1, v2 };
    }).sort((a, b) => b.diff - a.diff);

    const topCusts = custDiffs.slice(0, 3).filter(c => c.diff > 0);
    const dropCusts = [...custDiffs].reverse().slice(0, 3).filter(c => c.diff < 0);

    // KS/ISO 인증 기업 비중 변화
    const certifiedSales1 = data1.filter(r => r.ksCert || r.isoCert).reduce((sum, r) => sum + r.salesAmount, 0);
    const certifiedSales2 = data2.filter(r => r.ksCert || r.isoCert).reduce((sum, r) => sum + r.salesAmount, 0);
    const certRatio1 = rev1 > 0 ? (certifiedSales1 / rev1) * 100 : 0;
    const certRatio2 = rev2 > 0 ? (certifiedSales2 / rev2) * 100 : 0;

    return {
      rev1,
      rev2,
      diff,
      rate,
      topDept,
      worstDept,
      topCusts,
      dropCusts,
      certRatio1,
      certRatio2,
    };
  }, [salesData, p1StartYear, p1StartMonth, p1EndYear, p1EndMonth, p2StartYear, p2StartMonth, p2EndYear, p2EndMonth]);

  // 2. 고객 분석 및 교육/인증 추천 데이터 생성
  const recommendations = useMemo(() => {
    const customerRecords: Record<string, {
      customerName: string;
      budgetTypes: Set<string>;
      materials: Set<string>;
      ksCert: boolean;
      isoCert: boolean;
      totalSales: number;
    }> = {};

    salesData.forEach(r => {
      if (!customerRecords[r.customerName]) {
        customerRecords[r.customerName] = {
          customerName: r.customerName,
          budgetTypes: new Set<string>(),
          materials: new Set<string>(),
          ksCert: false,
          isoCert: false,
          totalSales: 0,
        };
      }
      const record = customerRecords[r.customerName];
      record.budgetTypes.add(r.budgetType);
      if (r.materialDetails) {
        record.materials.add(r.materialDetails.toString().trim());
      }
      record.totalSales += r.salesAmount;
      if (r.ksCert) record.ksCert = true;
      if (r.isoCert) record.isoCert = true;
    });

    const resultList = [];

    for (const key in customerRecords) {
      const r = customerRecords[key];
      const types = Array.from(r.budgetTypes);
      const materials = Array.from(r.materials);

      // 대상 선별 규칙 1: 반드시 '공개교육'을 수강한 적이 있는 기업 기준
      const hasPublicEdu = types.some(t => t.includes('공개교육') || t.includes('공개연수'));
      if (!hasPublicEdu) continue;

      // 대상 선별 규칙 2: 수강한 자재내역(교육명) 중 '설비윤활기술' 단 1개만 수강했는지 여부 판별
      const isOnlyLubrication = materials.length === 1 && materials[0] === '설비윤활기술';

      // 추천 룰 적용:
      // '공개교육' 이력은 있지만 '사내교육'이 없는 경우
      const hasInHouseEdu = types.some(t => t.includes('사내교육') || t.includes('위탁연수'));
      const suggestInHouse = !hasInHouseEdu;

      // '공개교육' 이력은 있지만 '현장교육(OJT)'이 없는 경우
      const hasOjt = types.some(t => t.includes('현장교육') || t.includes('OJT'));
      const suggestOjt = !hasOjt;

      // ISO인증 미보유 기업
      const suggestIso = !r.isoCert;

      resultList.push({
        customerName: r.customerName,
        totalSales: r.totalSales,
        ksCert: r.ksCert,
        isoCert: r.isoCert,
        hasPublicEdu,
        hasInHouseEdu,
        hasOjt,
        suggestInHouse,
        suggestOjt,
        suggestIso,
        isOnlyLubrication,
      });
    }

    return resultList.sort((a, b) => b.totalSales - a.totalSales);
  }, [salesData]);

  // 필터링된 추천 데이터
  const filteredRecs = useMemo(() => {
    return recommendations.filter(item => {
      // 1. 검색어 필터
      const matchSearch = item.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      // 2. 설비윤활기술 단독 수강 제외 필터
      if (excludeLubrication && item.isOnlyLubrication) return false;

      // 3. 제안 유형 필터
      if (filterType === 'inhouse') return item.suggestInHouse;
      if (filterType === 'ojt') return item.suggestOjt;
      if (filterType === 'iso') return item.suggestIso;
      return true;
    });
  }, [recommendations, searchTerm, filterType, excludeLubrication]);

  return (
    <div className="animate-fade-in space-y-6 text-slate-700">
      
      {/* ===================== 기간 비교 분석 브리핑 세션 ===================== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* 기간 선택 컨트롤러 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
              분석 대상 기간 설정
            </h3>
            
            {/* 기간 1 */}
            <div className="space-y-3 mb-6">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">비교 기간 1 (기준)</label>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={p1StartYear}
                  onChange={(e) => {
                    setP1StartYear(Number(e.target.value));
                    if (p1EndYear < Number(e.target.value)) setP1EndYear(Number(e.target.value));
                  }}
                  className="px-3 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select
                  value={p1StartMonth}
                  onChange={(e) => setP1StartMonth(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
                </select>
              </div>
              <div className="text-center text-xs text-slate-400 font-bold">~</div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={p1EndYear}
                  onChange={(e) => setP1EndYear(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {availableYears.filter(y => y >= p1StartYear).map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select
                  value={p1EndMonth}
                  onChange={(e) => setP1EndMonth(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
                </select>
              </div>
            </div>

            <hr className="my-5 border-dashed border-slate-200" />

            {/* 기간 2 */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">비교 기간 2 (대비)</label>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={p2StartYear}
                  onChange={(e) => {
                    setP2StartYear(Number(e.target.value));
                    if (p2EndYear < Number(e.target.value)) setP2EndYear(Number(e.target.value));
                  }}
                  className="px-3 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select
                  value={p2StartMonth}
                  onChange={(e) => setP2StartMonth(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
                </select>
              </div>
              <div className="text-center text-xs text-slate-400 font-bold">~</div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={p2EndYear}
                  onChange={(e) => setP2EndYear(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {availableYears.filter(y => y >= p2StartYear).map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select
                  value={p2EndMonth}
                  onChange={(e) => setP2EndMonth(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 text-xs text-slate-500 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-2 items-start">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>비교할 두 연월 범위를 설정하면, 우측의 통계 보고서가 동적으로 계산되어 갱신됩니다.</span>
          </div>
        </div>

        {/* AI 분석 리포트 요약 카드 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between xl:col-span-2">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                기간 대비 경영분석 브리핑
              </h3>
              <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 font-bold border border-indigo-100">
                실시간 분석 리포트
              </span>
            </div>

            {/* 주요 지표 박스 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 block mb-1">기준 기간 매출 (P1)</span>
                <span className="text-lg font-bold text-slate-800">{formatKRW(briefingReport.rev1, false)}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 block mb-1">대비 기간 매출 (P2)</span>
                <span className="text-lg font-bold text-slate-800">{formatKRW(briefingReport.rev2, false)}</span>
              </div>
              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100/50">
                <span className="text-xs font-semibold text-indigo-600 block mb-1">매출 변화율</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-extrabold ${briefingReport.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatPercent(briefingReport.rate)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    ({briefingReport.diff >= 0 ? '+' : ''}{formatKRW(briefingReport.diff, true)})
                  </span>
                </div>
              </div>
            </div>

            {/* 줄글 브리핑 리포트 출력 */}
            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>
                선택하신 기준 기간(P1: {p1StartYear}년 {p1StartMonth}월 ~ {p1EndYear}년 {p1EndMonth}월) 대비 
                비교 기간(P2: {p2StartYear}년 {p2StartMonth}월 ~ {p2EndYear}년 {p2EndMonth}월)의 매출 변화를 분석한 결과, 
                총매출액은 기존 <strong className="text-slate-800">{formatKRW(briefingReport.rev1)}</strong>에서 
                <strong className="text-slate-800"> {formatKRW(briefingReport.rev2)}</strong>로 
                <strong className={`mx-1 ${briefingReport.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{Math.abs(briefingReport.rate).toFixed(1)}% {briefingReport.diff >= 0 ? '상승' : '하락'}</strong>
                하였습니다.
              </p>

              {briefingReport.topDept && (
                <p>
                  부서별 실적 추이의 경우, 가장 큰 폭의 매출 성장을 일구어낸 부서는 
                  <strong className="text-emerald-600"> {briefingReport.topDept.name}</strong>로 
                  이전 대비 <strong className="text-slate-800">{formatKRW(briefingReport.topDept.diff)}</strong>의 성장을 기록하며 전체 영업을 주도했습니다.
                  {briefingReport.worstDept && briefingReport.worstDept.diff < 0 && (
                    <span> 반면, <strong className="text-rose-600">{briefingReport.worstDept.name}</strong> 부서는 이전보다 
                    <strong className="text-slate-800"> {formatKRW(Math.abs(briefingReport.worstDept.diff))}</strong>의 실적 감소를 나타내어 가장 큰 낙폭을 보였습니다.</span>
                  )}
                </p>
              )}

              {briefingReport.topCusts.length > 0 && (
                <div>
                  <p>
                    고객사 단위로는 
                    {briefingReport.topCusts.map((c, i) => (
                      <span key={c.name}>
                        {i > 0 ? ', ' : ''}<strong className="text-slate-800">{c.name}</strong>(증가 {formatKRW(c.diff)})
                      </span>
                    ))}
                    업체가 성장을 주도하였습니다.
                    {briefingReport.dropCusts.length > 0 && (
                      <span> 한편, 
                        {briefingReport.dropCusts.map((c, i) => (
                          <span key={c.name}>
                            {i > 0 ? ', ' : ''}<strong className="text-slate-800">{c.name}</strong>({formatKRW(c.diff)})
                          </span>
                        ))}
                        기업은 수강 및 심사 이용 총액이 눈격하게 떨어져 해당 업체들을 타겟으로 한 밀착 영접 및 사후 관리가 필요할 것으로 판단됩니다.
                      </span>
                    )}
                  </p>
                </div>
              )}

              <p>
                인증 기업(KS 또는 ISO 인증 보유)들의 매출 점유율을 대조한 결과, 
                기존 <strong className="text-slate-800">{briefingReport.certRatio1.toFixed(1)}%</strong>에서 
                대비 기간에는 <strong className="text-slate-800">{briefingReport.certRatio2.toFixed(1)}%</strong>로 
                <strong className="text-indigo-600"> {(briefingReport.certRatio2 - briefingReport.certRatio1).toFixed(1)}%p {briefingReport.certRatio2 >= briefingReport.certRatio1 ? '증가' : '감소'}</strong>
                하였습니다.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            이 브리핑은 엑셀 데이터 분석 모델에 의해 동적으로 즉각 렌더링되었습니다.
          </div>
        </div>
      </div>

      {/* ===================== 교육/인증 기회 제안 테이블 세션 ===================== */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        
        {/* 타이틀 및 필터 헤더 */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              신규 교육 및 인증 컨설팅 영업 제안 목록
            </h3>
            <p className="text-xs text-slate-400 mt-1.5">
              공개교육 수강 이력이 있는 기업들 중, 사내/OJT 미도입 업체 및 ISO 미인증 업체를 영업 타겟으로 추천합니다.
            </p>
          </div>

          {/* 검색, 제외 토글 및 필터 컨트롤 */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* [신규 추가] 설비윤활기술 단독수강 제외 토글 스위치 버튼 */}
            <button
              onClick={() => setExcludeLubrication(!excludeLubrication)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                excludeLubrication 
                  ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100/50' 
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200/50'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${excludeLubrication ? 'text-rose-500' : 'text-slate-400'}`} />
              설비윤활기술만 수강한 업체 제외 : {excludeLubrication ? 'ON' : 'OFF'}
            </button>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="고객사명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 bg-slate-50 text-slate-700 w-52 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-transparent border-0 text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="all">전체 추천 유형</option>
                <option value="inhouse">사내교육 미도입</option>
                <option value="ojt">현장교육(OJT) 미도입</option>
                <option value="iso">ISO인증 미보유</option>
              </select>
            </div>
          </div>
        </div>

        {/* 제안 테이블 */}
        <div className="overflow-x-auto rounded-xl border border-slate-150">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-150">
                <th className="px-6 py-4">고객사명</th>
                <th className="px-6 py-4">누적 매출액</th>
                <th className="px-6 py-4">인증 현황</th>
                <th className="px-6 py-4">현재 도입된 교육 이력</th>
                <th className="px-6 py-4">맞춤형 컨설팅 및 교육 추천 제안</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filteredRecs.length > 0 ? (
                filteredRecs.map((item) => (
                  <tr key={item.customerName} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {item.customerName}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {formatKRW(item.totalSales, false)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${item.ksCert ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200/60'}`}>
                          {item.ksCert ? 'KS 보유' : 'KS 미보유'}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${item.isoCert ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200/60'}`}>
                          {item.isoCert ? 'ISO 보유' : 'ISO 미보유'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">✔ 공개교육 수강함</span>
                        {item.hasInHouseEdu ? (
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">✔ 사내교육 이력 있음</span>
                        ) : (
                          <span className="text-xs text-rose-500 font-bold flex items-center gap-1">❌ 사내교육 미수강</span>
                        )}
                        {item.hasOjt ? (
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">✔ OJT 이력 있음</span>
                        ) : (
                          <span className="text-xs text-rose-500 font-bold flex items-center gap-1">❌ 현장교육(OJT) 미실시</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-2">
                      {item.suggestInHouse && (
                        <div className="flex items-start gap-2 bg-indigo-50/40 border border-indigo-100 p-2.5 rounded-lg">
                          <BookOpen className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-indigo-700 block">[사내교육 제안]</span>
                            <span className="text-xs text-slate-600 font-medium">공개교육 수강 이력 기반 맞춤형 사내 위탁연수 도입 제안</span>
                          </div>
                        </div>
                      )}
                      {item.suggestOjt && (
                        <div className="flex items-start gap-2 bg-amber-50/30 border border-amber-100 p-2.5 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-amber-700 block">[현장교육(OJT) 제안]</span>
                            <span className="text-xs text-slate-600 font-medium">현장 맞춤 생산성 혁신 OJT 교육 프로그램 영업 연계</span>
                          </div>
                        </div>
                      )}
                      {item.suggestIso && (
                        <div className="flex items-start gap-2 bg-rose-50/40 border border-rose-100 p-2.5 rounded-lg">
                          <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-rose-700 block">[ISO인증 심사 제안]</span>
                            <span className="text-xs text-slate-600 font-medium">대외 신인도 및 거래 요건을 위한 ISO 9001/14001 인증 심사 컨설팅 제안</span>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium bg-slate-50/20">
                    검색 결과 또는 추천 대상 기업이 존재하지 않습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
