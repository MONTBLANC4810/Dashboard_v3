import { useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { formatPercent } from '../utils/format';
import { Building2, BookOpen, ArrowRightLeft, Sparkles, Search, HelpCircle, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

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

  // [신규 추가] 상단 AI 경영분석 영역 접고 펴는 토글 상태 (기본값: true - 펼쳐진 상태)
  const [isBriefingExpanded, setIsBriefingExpanded] = useState<boolean>(true);

  // 경영분석 브리핑 기간 설정 (기간 1 - 기준 기간)
  const [p1StartYear, setP1StartYear] = useState<number>(availableYears[1] || 2025);
  const [p1StartMonth, setP1StartMonth] = useState<number>(1);
  const [p1EndYear, setP1EndYear] = useState<number>(availableYears[1] || 2025);
  const [p1EndMonth, setP1EndMonth] = useState<number>(12);

  // 경영분석 브리핑 기간 설정 (기간 2 - 대비 기간)
  const [p2StartYear, setP2StartYear] = useState<number>(availableYears[0] || 2026);
  const [p2StartMonth, setP2StartMonth] = useState<number>(1);
  const [p2EndYear, setP2EndYear] = useState<number>(availableYears[0] || 2026);
  const [p2EndMonth, setP2EndMonth] = useState<number>(12);

  // 신규 사업 발굴 대상 전용 독자 조회 기간 필터 상태 설정 (기본값: 전체 기간)
  const [recStartYear, setRecStartYear] = useState<number>(2021);
  const [recStartMonth, setRecStartMonth] = useState<number>(1);
  const [recEndYear, setRecEndYear] = useState<number>(2026);
  const [recEndMonth, setRecEndMonth] = useState<number>(12);

  // 검색어 상태 및 교육 종류별 필터 조건 (있음:has, 없음:none, 전체:all)
  const [searchTerm, setSearchTerm] = useState('');
  const [publicFilter, setPublicFilter] = useState<'all' | 'has' | 'none'>('has'); // 기본값: 공개교육 있음
  const [inhouseFilter, setInhouseFilter] = useState<'all' | 'has' | 'none'>('all');
  const [ojtFilter, setOjtFilter] = useState<'all' | 'has' | 'none'>('all');
  
  // 관할지부 전북 O/X 필터 상태 (전체:all, 전북임:yes, 전북아님:no)
  const [jeonbukFilter, setJeonbukFilter] = useState<'all' | 'yes' | 'no'>('all');

  // 기간별 필터 함수
  const getPeriodData = (startYear: number, startMonth: number, endYear: number, endMonth: number) => {
    return salesData.filter(r => {
      const recordVal = r.year * 100 + r.month;
      const startVal = startYear * 100 + startMonth;
      const endVal = endYear * 100 + endMonth;
      return recordVal >= startVal && recordVal <= endVal;
    });
  };

  // 1. 기간 비교 및 브리핑 생성 로직 (증감에 따른 한글 문맥 보완 및 자재내역 품목 분석 추가)
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

    const topDept = deptDiffs.length > 0 ? deptDiffs[0] : null; 
    const worstDept = deptDiffs.length > 0 ? deptDiffs[deptDiffs.length - 1] : null;

    // 자재내역(품목)별 매출 합산 및 증감 계산
    const matMap1: Record<string, number> = {};
    const matMap2: Record<string, number> = {};
    data1.forEach(r => {
      if (r.materialDetails) {
        const key = r.materialDetails.toString().trim();
        if (key) matMap1[key] = (matMap1[key] || 0) + r.salesAmount;
      }
    });
    data2.forEach(r => {
      if (r.materialDetails) {
        const key = r.materialDetails.toString().trim();
        if (key) matMap2[key] = (matMap2[key] || 0) + r.salesAmount;
      }
    });

    const mats = Array.from(new Set([...Object.keys(matMap1), ...Object.keys(matMap2)]));
    const matDiffs = mats.map(name => {
      const v1 = matMap1[name] || 0;
      const v2 = matMap2[name] || 0;
      return { name, diff: v2 - v1, v1, v2 };
    }).sort((a, b) => b.diff - a.diff);

    const topMat = matDiffs.length > 0 ? matDiffs[0] : null;
    const worstMat = matDiffs.length > 0 ? matDiffs[matDiffs.length - 1] : null;

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
      topMat,
      worstMat,
      topCusts,
      dropCusts,
      certRatio1,
      certRatio2,
    };
  }, [salesData, p1StartYear, p1StartMonth, p1EndYear, p1EndMonth, p2StartYear, p2StartMonth, p2EndYear, p2EndMonth]);

  // 신규 사업 발굴 전용 기간 필터가 적용된 매출 데이터 추출
  const filteredSalesForRec = useMemo(() => {
    return salesData.filter(r => {
      const recordVal = r.year * 100 + r.month;
      const startVal = recStartYear * 100 + recStartMonth;
      const endVal = recEndYear * 100 + recEndMonth;
      return recordVal >= startVal && recordVal <= endVal;
    });
  }, [salesData, recStartYear, recStartMonth, recEndYear, recEndMonth]);

  // 2. 고객 분석 및 교육 종류별 과거 수강 이력(Top 5) 데이터 생성 (신규 지정 기간 내 집계 적용)
  const recommendations = useMemo(() => {
    const customerRecords: Record<string, {
      customerName: string;
      publicSales: number;
      inhouseSales: number;
      ojtSales: number;
      publicMaterials: Record<string, number>;
      inhouseMaterials: Record<string, number>;
      ojtMaterials: Record<string, number>;
      ksCert: boolean;
      isoCert: boolean;
      isJeonbuk: boolean; // 관할지부 전북 여부
      branchOffice: string; // 화면 표시용 지부 명칭
      memberStatus: string; // 비고 열 매핑용 회원 등급 상태
    }> = {};

    filteredSalesForRec.forEach(r => {
      if (!customerRecords[r.customerName]) {
        customerRecords[r.customerName] = {
          customerName: r.customerName,
          publicSales: 0,
          inhouseSales: 0,
          ojtSales: 0,
          publicMaterials: {},
          inhouseMaterials: {},
          ojtMaterials: {},
          ksCert: false,
          isoCert: false,
          isJeonbuk: false,
          branchOffice: '',
          memberStatus: '',
        };
      }
      const record = customerRecords[r.customerName];
      if (r.ksCert) record.ksCert = true;
      if (r.isoCert) record.isoCert = true;
      
      // 관할지부 값 유지
      if (r.branchOffice) {
        record.branchOffice = r.branchOffice;
        if (r.branchOffice.includes('전북')) {
          record.isJeonbuk = true;
        }
      }

      // 회원상태값 수집
      if (r.memberStatus) {
        record.memberStatus = r.memberStatus;
      }

      const budget = r.budgetType || '';
      const mat = r.materialDetails ? r.materialDetails.toString().trim() : '';

      // [엄격 제한] 오직 예산목이 '공개교육'인 경우만 포함 (공개연수 완전 배제)
      if (budget === '공개교육') {
        record.publicSales += r.salesAmount;
        if (mat) record.publicMaterials[mat] = (record.publicMaterials[mat] || 0) + 1;
      } else if (budget.includes('사내교육') || budget.includes('위탁연수') || budget.includes('이러닝(사내)') || budget.includes('KS교육(사내)')) {
        record.inhouseSales += r.salesAmount;
        if (mat) record.inhouseMaterials[mat] = (record.inhouseMaterials[mat] || 0) + 1;
      } else if (budget.includes('현장교육') || budget.includes('OJT')) {
        record.ojtSales += r.salesAmount;
        if (mat) record.ojtMaterials[mat] = (record.ojtMaterials[mat] || 0) + 1;
      }
    });

    const resultList = [];

    for (const key in customerRecords) {
      const r = customerRecords[key];

      // 대상 선별 기준: '공개교육' 수강 이력이 1회라도 있는 기업들 중심
      const hasPublicEdu = r.publicSales > 0;
      if (!hasPublicEdu) continue;

      const hasInHouseEdu = r.inhouseSales > 0;
      const hasOjt = r.ojtSales > 0;

      // 항목별 과거 수강 이력 Top 5
      const getTopFive = (materialsRecord: Record<string, number>) => {
        return Object.entries(materialsRecord)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));
      };

      resultList.push({
        customerName: r.customerName,
        ksCert: r.ksCert,
        isoCert: r.isoCert,
        isJeonbuk: r.isJeonbuk,
        branchOffice: r.branchOffice || '-',
        memberStatus: r.memberStatus || '',
        hasPublicEdu,
        hasInHouseEdu,
        hasOjt,
        publicSales: r.publicSales,
        inhouseSales: r.inhouseSales,
        ojtSales: r.ojtSales,
        topPublicMaterials: getTopFive(r.publicMaterials),
        topInhouseMaterials: getTopFive(r.inhouseMaterials),
        topOjtMaterials: getTopFive(r.ojtMaterials),
      });
    }

    // 기본적으로 공개교육 매출이 많은 순으로 정렬
    return resultList.sort((a, b) => b.publicSales - a.publicSales);
  }, [filteredSalesForRec]);

  // 필터링된 추천 데이터
  const filteredRecs = useMemo(() => {
    return recommendations.filter(item => {
      // 1. 검색어 필터
      const matchSearch = item.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      // 2. 공개교육 필터 (O:has / X:none / 전체:all)
      if (publicFilter === 'has' && !item.hasPublicEdu) return false;
      if (publicFilter === 'none' && item.hasPublicEdu) return false;

      // 3. 사내교육 필터 (O:has / X:none / 전체:all)
      if (inhouseFilter === 'has' && !item.hasInHouseEdu) return false;
      if (inhouseFilter === 'none' && item.hasInHouseEdu) return false;

      // 4. 현장교육 필터 (O:has / X:none / 전체:all)
      if (ojtFilter === 'has' && !item.hasOjt) return false;
      if (ojtFilter === 'none' && item.hasOjt) return false;

      // 5. 관할지부 전북 필터 (O:yes / X:no / 전체:all)
      if (jeonbukFilter === 'yes' && !item.isJeonbuk) return false;
      if (jeonbukFilter === 'no' && item.isJeonbuk) return false;

      return true;
    });
  }, [recommendations, searchTerm, publicFilter, inhouseFilter, ojtFilter, jeonbukFilter]);

  return (
    <div className="animate-fade-in space-y-6 text-slate-700">
      
      {/* ===================== [신규 구현] AI 경영분석 아코디언 헤더 바 ===================== */}
      <div 
        onClick={() => setIsBriefingExpanded(!isBriefingExpanded)}
        className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all select-none"
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
          <span className="text-base font-bold text-slate-800">AI 경영분석 브리핑 요약</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-semibold border border-indigo-100">
            기간 설정 및 통계 보고서
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/60 px-3 py-1.5 rounded-xl border border-indigo-100 hover:bg-indigo-100/50 transition-all">
          <span>{isBriefingExpanded ? '경영분석 접기' : '경영분석 펼치기'}</span>
          {isBriefingExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* ===================== 경영분석 브리핑 세션 (접고 펼치기 조건부 렌더링) ===================== */}
      {isBriefingExpanded && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-slide-down">
          
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  경영분석 브리핑
                </h3>
                <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 font-bold border border-indigo-100">
                  실시간 분석 리포트
                </span>
              </div>

              {/* 주요 지표 박스 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">기준 기간 매출 (P1)</span>
                  <span className="text-base font-bold text-slate-800">{formatToThousand(briefingReport.rev1)}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">대비 기간 매출 (P2)</span>
                  <span className="text-base font-bold text-slate-800">{formatToThousand(briefingReport.rev2)}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">매출 변화율</span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-lg font-extrabold ${briefingReport.diff >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatPercent(briefingReport.rate)}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      ({briefingReport.diff >= 0 ? '+' : ''}{formatToThousand(briefingReport.diff)})
                    </span>
                  </div>
                </div>
              </div>

              {/* 줄글 브리핑 리포트 */}
              <div className="space-y-3.5 text-[13px] text-slate-600 leading-relaxed">
                <p>
                  선택하신 기준 기간(P1: {p1StartYear}년 {p1StartMonth}월 ~ {p1EndYear}년 {p1EndMonth}월) 대비 
                  비교 기간(P2: {p2StartYear}년 {p2StartMonth}월 ~ {p2EndYear}년 {p2EndMonth}월)의 매출 변화를 분석한 결과, 
                  총매출액은 기존 <strong className="text-slate-800">{formatToThousand(briefingReport.rev1)}</strong>에서 
                  <strong className="text-slate-800"> {formatToThousand(briefingReport.rev2)}</strong>로 
                  <strong className={`mx-1 ${briefingReport.diff >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{Math.abs(briefingReport.rate).toFixed(1)}% {briefingReport.diff >= 0 ? '상승' : '하락'}</strong>
                  하였습니다.
                </p>

                {/* 부서별 실적 어휘 보정 */}
                {briefingReport.topDept && (
                  <p>
                    부서별 실적 추이의 경우, 
                    {briefingReport.topDept.diff >= 0 ? (
                      <span>이전 대비 가장 큰 폭의 매출 성장을 일구어낸 부서는 <strong className="text-blue-600">{briefingReport.topDept.name}</strong>로, <strong className="text-slate-800">{formatToThousand(briefingReport.topDept.diff)}</strong>의 실적 성장을 보이며 영업을 주도했습니다.</span>
                    ) : (
                      <span>모든 부서의 실적이 감소세를 나타낸 가운데, <strong className="text-blue-600">{briefingReport.topDept.name}</strong> 부서가 이전 대비 <strong className="text-slate-800">{formatToThousand(Math.abs(briefingReport.topDept.diff))}</strong>의 실적 감소 수준에 그쳐 하락 폭을 가장 최소화했습니다.</span>
                    )}
                    {briefingReport.worstDept && briefingReport.worstDept.diff < 0 && (
                      <span> 반면, <strong className="text-red-600">{briefingReport.worstDept.name}</strong> 부서는 이전 대비 <strong className="text-slate-800">{formatToThousand(Math.abs(briefingReport.worstDept.diff))}</strong>의 실적 하락을 나타내며 가장 큰 하락 폭을 보였습니다.</span>
                    )}
                  </p>
                )}

                {/* 자재내역(품목)별 실적 추이 브리핑 */}
                {briefingReport.topMat && (
                  <p>
                    교육 사업 및 품목 단위(자재내역 기준) 분석 결과, 
                    {briefingReport.topMat.diff >= 0 ? (
                      <span>가장 눈에 띄는 매출 신장을 기록한 교육 품목은 <strong className="text-blue-600">{briefingReport.topMat.name}</strong>(이전 대비 {formatToThousand(briefingReport.topMat.diff)} 증가)으로 <strong className="text-blue-600">매출 성장을 주도했습니다.</strong></span>
                    ) : (
                      <span>전반적인 교육 품목 수요가 위축된 가운데, <strong className="text-blue-600">{briefingReport.topMat.name}</strong>과정의 실적 하락폭({formatToThousand(Math.abs(briefingReport.topMat.diff))} 감소)이 가장 선방한 것으로 나타났습니다.</span>
                    )}
                    {briefingReport.worstMat && briefingReport.worstMat.diff < 0 && (
                      <span> 반면, 매출 실적이 가장 크게 뒷걸음질 친 교육 품목은 <strong className="text-red-600">{briefingReport.worstMat.name}</strong>(이전 대비 {formatToThousand(Math.abs(briefingReport.worstMat.diff))} 감소)으로 영업 및 판촉 보완이 시급합니다.</span>
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
                              {i > 0 ? ', ' : ''}<strong className="text-slate-800">{c.name}</strong>(감소 {formatToThousand(Math.abs(c.diff))})
                            </span>
                          ))}
                          기업은 수강 및 심사 이용 총액이 이전보다 큰 폭으로 감소하여 밀착 관리가 요구됩니다.
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

            <div className="mt-4.5 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
              이 브리핑은 엑셀 데이터 분석 모델에 의해 동적으로 즉각 렌더링되었습니다.
            </div>
          </div>
        </div>
      )}

      {/* ===================== 신규 사업 발굴 대상 세션 (언제나 고정) ===================== */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        
        {/* 타이틀 및 검색 헤더 (신규 조회 기간 필터 추가) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              신규 사업 발굴 대상
            </h3>
            <p className="text-xs text-slate-400 mt-1.5">
              공개교육 수강 이력이 있는 기업 중 사내/현장 도입 현황 및 인증 상태를 분석하여 미래의 교육/컨설팅 사업 기회를 발굴합니다.
            </p>
          </div>

          {/* 기간 설정 & 검색 기능 결합 배열 */}
          <div className="flex flex-wrap items-center gap-4">
            
            {/* 발굴 대상 전용 독자 기간 필터 */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600">
              <span className="text-slate-400">조회 기간:</span>
              <select
                value={recStartYear}
                onChange={(e) => {
                  setRecStartYear(Number(e.target.value));
                  if (recEndYear < Number(e.target.value)) setRecEndYear(Number(e.target.value));
                }}
                className="bg-transparent font-bold text-slate-800 focus:outline-none"
              >
                {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
              <select
                value={recStartMonth}
                onChange={(e) => setRecStartMonth(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 focus:outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
              </select>
              <span className="text-slate-400">~</span>
              <select
                value={recEndYear}
                onChange={(e) => setRecEndYear(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 focus:outline-none"
              >
                {availableYears.filter(y => y >= recStartYear).map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
              <select
                value={recEndMonth}
                onChange={(e) => setRecEndMonth(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 focus:outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
              </select>
            </div>

            {/* 검색창 */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="고객사명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 bg-slate-50 text-slate-700 w-48 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 4단 토글 필터 영역 */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* 공개교육 필터 */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 block">공개교육 이력</span>
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
                  {option === 'has' && 'O (기본)'}
                  {option === 'none' && 'X'}
                </button>
              ))}
            </div>
          </div>

          {/* 사내교육 필터 */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 block">사내교육 이력</span>
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
                  {option === 'has' && 'O'}
                  {option === 'none' && 'X'}
                </button>
              ))}
            </div>
          </div>

          {/* 현장교육 필터 */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 block">현장교육 이력</span>
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
                  {option === 'has' && 'O'}
                  {option === 'none' && 'X'}
                </button>
              ))}
            </div>
          </div>

          {/* 관할지부 전북 필터 */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 block">관할지부: 전북</span>
            <div className="flex bg-slate-200/60 p-1 rounded-lg">
              {(['all', 'yes', 'no'] as const).map(option => (
                <button
                  key={option}
                  onClick={() => setJeonbukFilter(option)}
                  className={`flex-1 text-center py-1.5 rounded-md text-xs font-bold transition-all ${
                    jeonbukFilter === option
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {option === 'all' && '전체'}
                  {option === 'yes' && 'O'}
                  {option === 'no' && 'X'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 제안 테이블 */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="text-sm font-bold text-slate-600 bg-slate-50 border-b border-slate-200">
                <th className="w-[20%] px-6 py-4 text-center">고객사명</th>
                <th className="w-[10%] px-4 py-4 text-center">인증 현황</th>
                <th className="w-[18%] px-6 py-4 text-center">사업 구분</th>
                <th className="w-[42%] px-6 py-4 text-center">세부내역</th>
                <th className="w-[10%] px-4 py-4 text-center">비고</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-200/90">
              {filteredRecs.length > 0 ? (
                filteredRecs.flatMap((item) => {
                  const activeRows = [];
                  if (item.publicSales > 0) {
                    activeRows.push({
                      type: 'public',
                      label: '공개교육',
                      sales: item.publicSales,
                      materials: item.topPublicMaterials,
                      colorClass: 'text-blue-600 bg-blue-50 border-blue-100',
                      badgeClass: 'bg-blue-50/60 border-blue-200 text-blue-700',
                      countClass: 'bg-blue-100 text-blue-600'
                    });
                  }
                  if (item.inhouseSales > 0) {
                    activeRows.push({
                      type: 'inhouse',
                      label: '사내교육',
                      sales: item.inhouseSales,
                      materials: item.topInhouseMaterials,
                      colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100',
                      badgeClass: 'bg-emerald-50/60 border-emerald-200 text-emerald-700',
                      countClass: 'bg-emerald-100 text-emerald-600'
                    });
                  }
                  if (item.ojtSales > 0) {
                    activeRows.push({
                      type: 'ojt',
                      label: '현장교육',
                      sales: item.ojtSales,
                      materials: item.topOjtMaterials,
                      colorClass: 'text-amber-600 bg-amber-50 border-amber-100',
                      badgeClass: 'bg-amber-50/60 border-amber-200 text-amber-700',
                      countClass: 'bg-amber-100 text-amber-600'
                    });
                  }

                  const rowSpan = activeRows.length;

                  return activeRows.map((row, rowIndex) => {
                    const isFirst = rowIndex === 0;

                    return (
                      <tr key={`${item.customerName}_${row.type}`} className="hover:bg-slate-50/50 transition-colors">
                        
                        {/* 1. 고객사명 */}
                        {isFirst && (
                          <td 
                            rowSpan={rowSpan} 
                            className="px-6 py-4 font-semibold text-slate-800 break-keep align-middle border-r border-slate-100"
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                              {item.customerName}
                            </div>
                          </td>
                        )}

                        {/* 2. 인증현황 */}
                        {isFirst && (
                          <td 
                            rowSpan={rowSpan} 
                            className="px-4 py-4 text-center align-middle border-r border-slate-100"
                          >
                            <div className="flex flex-col gap-1.5 items-center justify-center">
                              {item.ksCert && (
                                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center gap-1 w-24 mx-auto">
                                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                                  KS 보유
                                </span>
                              )}
                              {item.isoCert && (
                                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center gap-1 w-24 mx-auto">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                  ISO 보유
                                </span>
                              )}
                              {!item.ksCert && !item.isoCert && (
                                <span className="text-slate-400 text-xs italic">-</span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* 3. 사업 구분 */}
                        <td className="px-6 py-4 text-center align-middle border-r border-slate-100">
                          <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${row.colorClass}`}>
                            [{row.label}] {formatToThousand(row.sales)}
                          </span>
                        </td>

                        {/* 4. 세부내역 */}
                        <td className="px-6 py-4 align-middle border-r border-slate-100">
                          <div className="flex flex-col gap-1.5 items-start">
                            {row.materials.map((mat) => (
                              <span 
                                key={mat.name} 
                                className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium ${row.badgeClass}`}
                              >
                                {mat.name}
                                <span className={`ml-1 text-[9px] px-1 py-0.1 rounded font-extrabold ${row.countClass}`}>{mat.count}회</span>
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* 5. 비고 */}
                        {isFirst && (
                          <td 
                            rowSpan={rowSpan} 
                            className="px-4 py-4 text-center align-middle"
                          >
                            {item.memberStatus ? (
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center gap-1 w-24 mx-auto">
                                회원사
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">-</span>
                            )}
                          </td>
                        )}

                      </tr>
                    );
                  });
                })
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
