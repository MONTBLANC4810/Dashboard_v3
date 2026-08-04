import { useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { formatPercent } from '../utils/format';
import { Building2, BookOpen, ArrowRightLeft, Sparkles, Search, HelpCircle } from 'lucide-react';

// 숫자를 천원 단위 표기로 변환하는 포맷터 함수
function formatToThousand(value: number): string {
  if (!value && value !== 0) return '-';
  const thousands = Math.round(value / 1000);
  return thousands.toLocaleString('ko-KR') + '천원';
}

export function ConsultingTab() {
  const { salesData } = useDashboard();

  // 사용 가능한 연도 목록 추출
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(salesData.map(r => r.year))).sort((a, b) => b - a);
    return years.length > 0 ? years : [2026, 2025, 2024];
  }, [salesData]);

  // 기간 1 상태 설정 (기준 기간)
  const [p1StartYear, setP1StartYear] = useState<number>(availableYears[1] || 2025);
  const [p1StartMonth, setP1StartMonth] = useState<number>(1);
  const [p1EndYear, setP1EndYear] = useState<number>(availableYears[1] || 2025);
  const [p1EndMonth, setP1EndMonth] = useState<number>(12);

  // 기간 2 상태 설정 (대비 기간)
  const [p2StartYear, setP2StartYear] = useState<number>(availableYears[0] || 2026);
  const [p2StartMonth, setP2StartMonth] = useState<number>(1);
  const [p2EndYear, setP2EndYear] = useState<number>(availableYears[0] || 2026);
  const [p2EndMonth, setP2EndMonth] = useState<number>(12);

  // 검색어 상태 및 교육 종류별 필터 조건 (있음/없음/전체)
  const [searchTerm, setSearchTerm] = useState('');
  
  // 기본 필터: 공개교육은 수강한 기업 중심(has)이 기본값, 나머지는 전체(all)가 기본값
  const [publicFilter, setPublicFilter] = useState<'all' | 'has' | 'none'>('has');
  const [inhouseFilter, setInhouseFilter] = useState<'all' | 'has' | 'none'>('all');
  const [ojtFilter, setOjtFilter] = useState<'all' | 'has' | 'none'>('all');

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

  // 2. 고객 분석 및 과거 수강 이력(Top 5) 데이터 생성
  const recommendations = useMemo(() => {
    const customerRecords: Record<string, {
      customerName: string;
      budgetTypes: Set<string>;
      materials: Record<string, number>; // 자재내역(교육명) 빈도수 집계
      ksCert: boolean;
      isoCert: boolean;
      totalSales: number;
    }> = {};

    salesData.forEach(r => {
      if (!customerRecords[r.customerName]) {
        customerRecords[r.customerName] = {
          customerName: r.customerName,
          budgetTypes: new Set<string>(),
          materials: {},
          ksCert: false,
          isoCert: false,
          totalSales: 0,
        };
      }
      const record = customerRecords[r.customerName];
      record.budgetTypes.add(r.budgetType);
      
      if (r.materialDetails) {
        const mat = r.materialDetails.toString().trim();
        if (mat) {
          record.materials[mat] = (record.materials[mat] || 0) + 1;
        }
      }
      
      record.totalSales += r.salesAmount;
      if (r.ksCert) record.ksCert = true;
      if (r.isoCert) record.isoCert = true;
    });

    const resultList = [];

    for (const key in customerRecords) {
      const r = customerRecords[key];
      const types = Array.from(r.budgetTypes);

      // 각 교육 유형 유무 판별
      const hasPublicEdu = types.some(t => t.includes('공개교육') || t.includes('공개연수'));
      const hasInHouseEdu = types.some(t => t.includes('사내교육') || t.includes('위탁연수'));
      const hasOjt = types.some(t => t.includes('현장교육') || t.includes('OJT'));

      // 과거 수강 이력 상위 5개 산출
      const topMaterials = Object.entries(r.materials)
        .sort((a, b) => b[1] - a[1]) // 수강 횟수 내림차순 정렬
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      resultList.push({
        customerName: r.customerName,
        totalSales: r.totalSales,
        ksCert: r.ksCert,
        isoCert: r.isoCert,
        hasPublicEdu,
        hasInHouseEdu,
        hasOjt,
        topMaterials,
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

      // 2. 공개교육 필터 (전체/있음/없음)
      if (publicFilter === 'has' && !item.hasPublicEdu) return false;
      if (publicFilter === 'none' && item.hasPublicEdu) return false;

      // 3. 사내교육 필터 (전체/있음/없음)
      if (inhouseFilter === 'has' && !item.hasInHouseEdu) return false;
      if (inhouseFilter === 'none' && item.hasInHouseEdu) return false;

      // 4. 현장교육(OJT) 필터 (전체/있음/없음)
      if (ojtFilter === 'has' && !item.hasOjt) return false;
      if (ojtFilter === 'none' && item.hasOjt) return false;

      return true;
    });
  }, [recommendations, searchTerm, publicFilter, inhouseFilter, ojtFilter]);

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
            <span>두 연월 범위를 설정하면, 우측의 통계 보고서가 동적으로 계산되어 갱신됩니다.</span>
          </div>
        </div>

        {/* AI 분석 리포트 요약 카드 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between xl:col-span-2">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                기간 대비 경영분석 브리핑
              </h3>
              <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 font-bold border border-indigo-100">
                실시간 분석 리포트
              </span>
            </div>

            {/* 주요 지표 박스 (천원 단위 및 파랑/빨강 색상 적용) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 block mb-1">기준 기간 매출 (P1)</span>
                <span className="text-lg font-bold text-slate-800">{formatToThousand(briefingReport.rev1)}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 block mb-1">대비 기간 매출 (P2)</span>
                <span className="text-lg font-bold text-slate-800">{formatToThousand(briefingReport.rev2)}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 block mb-1">매출 변화율</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-extrabold ${briefingReport.diff >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatPercent(briefingReport.rate)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    ({briefingReport.diff >= 0 ? '+' : ''}{formatToThousand(briefingReport.diff)})
                  </span>
                </div>
              </div>
            </div>

            {/* 줄글 브리핑 리포트 (천원 단위, 맞춤법 및 파랑/빨강 색상 보완) */}
            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>
                선택하신 기준 기간(P1: {p1StartYear}년 {p1StartMonth}월 ~ {p1EndYear}년 {p1EndMonth}월) 대비 
                비교 기간(P2: {p2StartYear}년 {p2StartMonth}월 ~ {p2EndYear}년 {p2EndMonth}월)의 매출 변화를 분석한 결과, 
                총매출액은 기존 <strong className="text-slate-800">{formatToThousand(briefingReport.rev1)}</strong>에서 
                <strong className="text-slate-800"> {formatToThousand(briefingReport.rev2)}</strong>로 
                <strong className={`mx-1 ${briefingReport.diff >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{Math.abs(briefingReport.rate).toFixed(1)}% {briefingReport.diff >= 0 ? '상승' : '하락'}</strong>
                하였습니다.
              </p>

              {briefingReport.topDept && (
                <p>
                  부서별 실적 추이의 경우, 가장 큰 폭의 매출 성장을 일구어낸 부서는 
                  <strong className="text-blue-600"> {briefingReport.topDept.name}</strong>로 
                  이전 대비 <strong className="text-slate-800">{formatToThousand(briefingReport.topDept.diff)}</strong>의 성장을 기록하며 전체 영업을 주도했습니다.
                  {briefingReport.worstDept && briefingReport.worstDept.diff < 0 && (
                    <span> 반면, <strong className="text-red-600">{briefingReport.worstDept.name}</strong> 부서는 이전보다 
                    <strong className="text-slate-800"> {formatToThousand(Math.abs(briefingReport.worstDept.diff))}</strong>의 실적 감소를 나타내어 가장 큰 낙폭을 보였습니다.</span>
                  )}
                </p>
              )}

              {briefingReport.topCusts.length > 0 && (
                <div>
                  <p>
                    고객사 단위로는 
                    {briefingReport.topCusts.map((c, i) => (
                      <span key={c.name}>
                        {i > 0 ? ', ' : ''}<strong className="text-slate-800">{c.name}</strong>(증가 {formatToThousand(c.diff)})
                      </span>
                    ))}
                    업체가 성장을 견인하였습니다.
                    {briefingReport.dropCusts.length > 0 && (
                      <span> 한편, 
                        {briefingReport.dropCusts.map((c, i) => (
                          <span key={c.name}>
                            {i > 0 ? ', ' : ''}<strong className="text-slate-800">{c.name}</strong>({formatToThousand(c.diff)})
                          </span>
                        ))}
                        기업은 수강 및 심사 이용 총액이 눈에 띄게 감소하여 해당 업체들을 타겟으로 한 밀착 관리 및 영업이 필요할 것으로 판단됩니다.
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
                하였습니다. 이는 시장에서 공신력 있는 인증 마크의 가치와 매출 귀속도가 여전히 주요 변수로 작동하고 있음을 방증합니다.
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
        
        {/* 타이틀 및 검색/필터 헤더 */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              신규 교육 및 인증 컨설팅 영업 제안 목록
            </h3>
            <p className="text-xs text-slate-400 mt-1.5">
              고객사의 교육 수강 유무를 조건별로 필터링하고 과거 수강 이력 순위를 추적합니다.
            </p>
          </div>

          {/* 검색 기능 */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="고객사명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 bg-slate-50 text-slate-700 w-64 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* [신규 변경] 공개교육, 사내교육, 현장교육(OJT) 3단 개별 토글 필터 컨트롤러 영역 */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* 공개교육 필터 */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 block">공개교육 수강 여부</span>
            <div className="flex bg-slate-200/60 p-1 rounded-lg">
              {(['all', 'has', 'none'] as const).map(option => (
                <button
                  key={option}
                  onClick={() => setPublicFilter(option)}
                  className={`flex-1 text-center py-1.5 rounded-md text-xs font-bold transition-all ${
                    publicFilter === option
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {option === 'all' && '전체'}
                  {option === 'has' && '수강함 (기본)'}
                  {option === 'none' && '미수강'}
                </button>
              ))}
            </div>
          </div>

          {/* 사내교육 필터 */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 block">사내교육 수강 여부</span>
            <div className="flex bg-slate-200/60 p-1 rounded-lg">
              {(['all', 'has', 'none'] as const).map(option => (
                <button
                  key={option}
                  onClick={() => setInhouseFilter(option)}
                  className={`flex-1 text-center py-1.5 rounded-md text-xs font-bold transition-all ${
                    inhouseFilter === option
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {option === 'all' && '전체'}
                  {option === 'has' && '수강함'}
                  {option === 'none' && '미수강'}
                </button>
              ))}
            </div>
          </div>

          {/* 현장교육(OJT) 필터 */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 block">현장교육(OJT) 수강 여부</span>
            <div className="flex bg-slate-200/60 p-1 rounded-lg">
              {(['all', 'has', 'none'] as const).map(option => (
                <button
                  key={option}
                  onClick={() => setOjtFilter(option)}
                  className={`flex-1 text-center py-1.5 rounded-md text-xs font-bold transition-all ${
                    ojtFilter === option
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {option === 'all' && '전체'}
                  {option === 'has' && '수강함'}
                  {option === 'none' && '미수강'}
                </button>
              ))}
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
                <th className="px-6 py-4">[신규] 과거 주요 수강 이력 (Top 5)</th>
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
                      {formatToThousand(item.totalSales)}
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
                        {item.hasPublicEdu ? (
                          <span className="text-xs text-blue-600 font-bold flex items-center gap-1">✔ 공개교육 수강함</span>
                        ) : (
                          <span className="text-xs text-slate-400 flex items-center gap-1">❌ 공개교육 미수강</span>
                        )}
                        {item.hasInHouseEdu ? (
                          <span className="text-xs text-indigo-600 font-bold flex items-center gap-1">✔ 사내교육 수강함</span>
                        ) : (
                          <span className="text-xs text-slate-400 flex items-center gap-1">❌ 사내교육 미수강</span>
                        )}
                        {item.hasOjt ? (
                          <span className="text-xs text-amber-600 font-bold flex items-center gap-1">✔ OJT 수강함</span>
                        ) : (
                          <span className="text-xs text-slate-400 flex items-center gap-1">❌ 현장교육(OJT) 미실시</span>
                        )}
                      </div>
                    </td>
                    {/* [신규 변경] 과거 주요 수강 이력 (Top 5) 노출 영역 */}
                    <td className="px-6 py-4">
                      {item.topMaterials.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {item.topMaterials.map((mat: { name: string, count: number }) => (
                            <span 
                              key={mat.name} 
                              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200/80"
                            >
                              {mat.name}
                              <span className="ml-1 text-[10px] bg-slate-200 px-1 py-0.2 rounded text-slate-500 font-extrabold">{mat.count}회</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">수강 이력 없음</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium bg-slate-50/20">
                    조건에 일치하는 대상 기업이 존재하지 않습니다.
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
