import { useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { formatKRW, formatPercent, getChangeColor } from '../utils/format';
import { Building2, BookOpen, AlertTriangle, ShieldCheck, ArrowRightLeft, Sparkles, Search, Filter } from 'lucide-react';

export function ConsultingTab() {
  const { salesData } = useDashboard();

  // 사용 가능한 연도 목록 추출
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(salesData.map(r => r.year))).sort((a, b) => b - a);
    return years.length > 0 ? years : [2026, 2025, 2024];
  }, [salesData]);

  // 기간 1 상태 설정 (기본값: 작년 - 데이터에 존재하는 최신 연도의 전년도 전체)
  const [p1StartYear, setP1StartYear] = useState<number>(availableYears[1] || 2025);
  const [p1StartMonth, setP1StartMonth] = useState<number>(1);
  const [p1EndYear, setP1EndYear] = useState<number>(availableYears[1] || 2025);
  const [p1EndMonth, setP1EndMonth] = useState<number>(12);

  // 기간 2 상태 설정 (기본값: 올해 - 데이터에 존재하는 최신 연도 전체)
  const [p2StartYear, setP2StartYear] = useState<number>(availableYears[0] || 2026);
  const [p2StartMonth, setP2StartMonth] = useState<number>(1);
  const [p2EndYear, setP2EndYear] = useState<number>(availableYears[0] || 2026);
  const [p2EndMonth, setP2EndMonth] = useState<number>(12);

  // 검색 및 제안 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'inhouse' | 'ojt' | 'iso'>('all');

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
    // 고객별 매출 종류 매핑
    const customerRecords: Record<string, {
      customerName: string;
      budgetTypes: Set<string>;
      ksCert: boolean;
      isoCert: boolean;
      totalSales: number;
    }> = {};

    salesData.forEach(r => {
      if (!customerRecords[r.customerName]) {
        customerRecords[r.customerName] = {
          customerName: r.customerName,
          budgetTypes: new Set<string>(),
          ksCert: false,
          isoCert: false,
          totalSales: 0,
        };
      }
      const record = customerRecords[r.customerName];
      record.budgetTypes.add(r.budgetType);
      record.totalSales += r.salesAmount;
      if (r.ksCert) record.ksCert = true;
      if (r.isoCert) record.isoCert = true;
    });

    const resultList = [];

    for (const key in customerRecords) {
      const r = customerRecords[key];
      const types = Array.from(r.budgetTypes);

      // 조건 분석
      const hasPublicEdu = types.some(t => t.includes('공개교육') || t.includes('공개연수'));
      const hasInHouseEdu = types.some(t => t.includes('사내교육') || t.includes('위탁연수'));
      const hasOjt = types.some(t => t.includes('현장교육') || t.includes('OJT'));

      // 추천 룰 적용:
      // '공개교육' 이력은 있지만 '사내교육'이 없는 경우
      const suggestInHouse = hasPublicEdu && !hasInHouseEdu;
      // '공개교육' 이력은 있지만 '현장교육(OJT)'이 없는 경우
      const suggestOjt = hasPublicEdu && !hasOjt;
      // ISO인증 미보유 기업
      const suggestIso = !r.isoCert;

      if (suggestInHouse || suggestOjt || (hasPublicEdu && suggestIso)) {
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
        });
      }
    }

    return resultList.sort((a, b) => b.totalSales - a.totalSales);
  }, [salesData]);

  // 필터링된 추천 데이터
  const filteredRecs = useMemo(() => {
    return recommendations.filter(item => {
      const matchSearch = item.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      if (filterType === 'inhouse') return item.suggestInHouse;
      if (filterType === 'ojt') return item.suggestOjt;
      if (filterType === 'iso') return item.suggestIso;
      return true;
    });
  }, [recommendations, searchTerm, filterType]);

  return (
    <div className="animate-fade-in space-y-8">
      {/* ===================== 기간 비교 분석 브리핑 세션 ===================== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* 기간 선택 컨트롤러 */}
        <div className="card xl:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
              분석 대상 기간 설정
            </h3>
            
            {/* 기간 1 */}
            <div className="space-y-3 mb-6">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">비교 기간 1 (기준)</label>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={p1StartYear}
                  onChange={(e) => {
                    setP1StartYear(Number(e.target.value));
                    if (p1EndYear < Number(e.target.value)) setP1EndYear(Number(e.target.value));
                  }}
                  className="px-3 py-2 rounded-xl text-sm font-medium border"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select
                  value={p1StartMonth}
                  onChange={(e) => setP1StartMonth(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl text-sm font-medium border"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
                </select>
              </div>
              <div className="text-center text-xs text-slate-500 font-bold">~</div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={p1EndYear}
                  onChange={(e) => setP1EndYear(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl text-sm font-medium border"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  {availableYears.filter(y => y >= p1StartYear).map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select
                  value={p1EndMonth}
                  onChange={(e) => setP1EndMonth(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl text-sm font-medium border"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
                </select>
              </div>
            </div>

            <hr className="my-5 border-dashed" style={{ borderColor: 'var(--border-subtle)' }} />

            {/* 기간 2 */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">비교 기간 2 (대비)</label>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={p2StartYear}
                  onChange={(e) => {
                    setP2StartYear(Number(e.target.value));
                    if (p2EndYear < Number(e.target.value)) setP2EndYear(Number(e.target.value));
                  }}
                  className="px-3 py-2 rounded-xl text-sm font-medium border"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select
                  value={p2StartMonth}
                  onChange={(e) => setP2StartMonth(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl text-sm font-medium border"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
                </select>
              </div>
              <div className="text-center text-xs text-slate-500 font-bold">~</div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={p2EndYear}
                  onChange={(e) => setP2EndYear(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl text-sm font-medium border"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  {availableYears.filter(y => y >= p2StartYear).map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select
                  value={p2EndMonth}
                  onChange={(e) => setP2EndMonth(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl text-sm font-medium border"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 text-xs text-slate-500 leading-relaxed bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
            💡 <strong>설정 팁:</strong> 전년 동기 대비 추이를 비교하려면 월 범위를 동일하게(예: 1월~12월) 설정해 주시는 것이 좋습니다.
          </div>
        </div>

        {/* AI 분석 리포트 요약 카드 */}
        <div className="card xl:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Sparkles className="w-5 h-5 text-indigo-400" />
                기간 비교 분석 리포트
              </h3>
              <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 font-bold">
                비용 0원 정적 AI 구동 중
              </span>
            </div>

            {/* 주요 지표 박스 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-800/60">
                <span className="text-xs font-medium text-slate-400 block mb-1">기준 기간 매출 (P1)</span>
                <span className="text-lg font-bold text-slate-200">{formatKRW(briefingReport.rev1, false)}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-800/60">
                <span className="text-xs font-medium text-slate-400 block mb-1">대비 기간 매출 (P2)</span>
                <span className="text-lg font-bold text-slate-200">{formatKRW(briefingReport.rev2, false)}</span>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/40">
                <span className="text-xs font-medium text-indigo-300 block mb-1">매출 변화율</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-bold ${getChangeColor(briefingReport.rate)}`}>
                    {formatPercent(briefingReport.rate)}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({briefingReport.diff >= 0 ? '+' : ''}{formatKRW(briefingReport.diff, true)})
                  </span>
                </div>
              </div>
            </div>

            {/* 줄글 브리핑 리포트 출력 */}
            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <p>
                선택하신 기준 기간(P1: {p1StartYear}년 {p1StartMonth}월 ~ {p1EndYear}년 {p1EndMonth}월) 대비 
                비교 기간(P2: {p2StartYear}년 {p2StartMonth}월 ~ {p2EndYear}년 {p2EndMonth}월)의 매출 변화를 분석한 결과, 
                총매출액은 기존 <strong>{formatKRW(briefingReport.rev1)}</strong>에서 
                <strong> {formatKRW(briefingReport.rev2)}</strong>로 
                <strong className={`mx-1 ${getChangeColor(briefingReport.rate)}`}>{Math.abs(briefingReport.rate).toFixed(1)}% {briefingReport.diff >= 0 ? '상승' : '하락'}</strong>
                하였습니다.
              </p>

              {briefingReport.topDept && (
                <p>
                  부서별로 분석하면, 가장 큰 성장을 기록한 부서는 
                  <strong className="text-emerald-400"> {briefingReport.topDept.name}</strong>로 
                  이전 대비 <strong>{formatKRW(briefingReport.topDept.diff)}</strong>의 매출 성장을 일구며 전체 실적을 주도했습니다.
                  {briefingReport.worstDept && briefingReport.worstDept.diff < 0 && (
                    <span> 반면, <strong className="text-rose-400">{briefingReport.worstDept.name}</strong> 부서는 이전보다 
                    <strong> {formatKRW(Math.abs(briefingReport.worstDept.diff))}</strong>의 실적 감소를 보여 가장 큰 낙폭을 기록했습니다.</span>
                  )}
                </p>
              )}

              {briefingReport.topCusts.length > 0 && (
                <div>
                  <p>
                    고객사 단위로는 
                    {briefingReport.topCusts.map((c, i) => (
                      <span key={c.name}>
                        {i > 0 ? ', ' : ''}<strong>{c.name}</strong>(growth {formatKRW(c.diff)})
                      </span>
                    ))}
                    업체가 성장을 적극적으로 견인하였습니다.
                    {briefingReport.dropCusts.length > 0 && (
                      <span> 한편, 
                        {briefingReport.dropCusts.map((c, i) => (
                          <span key={c.name}>
                            {i > 0 ? ', ' : ''}<strong>{c.name}</strong>({formatKRW(c.diff)})
                          </span>
                        ))}
                        기업은 발주량이 급감하여 밀착 영접 및 사후 관리가 강력히 요구됩니다.
                      </span>
                    )}
                  </p>
                </div>
              )}

              <p>
                인증 기업(KS 또는 ISO 인증 보유)들의 매출 점유율을 대조한 결과, 
                기존 <strong>{briefingReport.certRatio1.toFixed(1)}%</strong>에서 
                대비 기간에는 <strong>{briefingReport.certRatio2.toFixed(1)}%</strong>로 
                <strong className="text-indigo-300"> {(briefingReport.certRatio2 - briefingReport.certRatio1).toFixed(1)}%p {briefingReport.certRatio2 >= briefingReport.certRatio1 ? '증가' : '감소'}</strong>
                하였습니다. 이는 시장에서 공신력 있는 인증 마크의 가치와 매출 귀속도가 여전히 주요 변수로 작동하고 있음을 반증합니다.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-xs text-indigo-400 font-semibold bg-indigo-950/20 p-3 rounded-xl border border-indigo-900/30">
            <Sparkles className="w-4 h-4" />
            이 브리핑은 업로드된 엑셀 실적 데이터 10,797건을 통계 법칙에 따라 분석하여 실시간 자동 작성되었습니다.
          </div>
        </div>
      </div>

      {/* ===================== 교육/인증 기회 제안 테이블 세션 ===================== */}
      <div className="card">
        
        {/* 타이틀 및 필터 헤더 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <BookOpen className="w-5 h-5 text-indigo-400" />
              신규 교육 및 인증 컨설팅 영업 제안 목록
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              공개교육 수강 이력은 있으나 사내교육/OJT를 도입하지 않았거나 ISO인증이 없는 잠재 영업 타겟 기업을 선별합니다.
            </p>
          </div>

          {/* 검색 및 필터 컨트롤 */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="고객사명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2.5 rounded-xl text-sm font-medium border w-56 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-800">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-transparent border-0 text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
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
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-subtle)' }}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider" style={{ background: 'var(--bg-secondary)' }}>
                <th className="px-6 py-4">고객사명</th>
                <th className="px-6 py-4">누적 매출액</th>
                <th className="px-6 py-4">인증 현황</th>
                <th className="px-6 py-4">도입된 이력</th>
                <th className="px-6 py-4">맞춤형 컨설팅 및 교육 추천 제안</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {filteredRecs.length > 0 ? (
                filteredRecs.map((item) => (
                  <tr key={item.customerName} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-200">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        {item.customerName}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-300">
                      {formatKRW(item.totalSales, false)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${item.ksCert ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                          {item.ksCert ? 'KS 보유' : 'KS 미보유'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${item.isoCert ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                          {item.isoCert ? 'ISO 보유' : 'ISO 미보유'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-emerald-400 flex items-center gap-1">✔ 공개교육 수강함</span>
                        {item.hasInHouseEdu ? (
                          <span className="text-xs text-slate-400 flex items-center gap-1">✔ 사내교육 이력 있음</span>
                        ) : (
                          <span className="text-xs text-rose-400 flex items-center gap-1">❌ 사내교육 미수강</span>
                        )}
                        {item.hasOjt ? (
                          <span className="text-xs text-slate-400 flex items-center gap-1">✔ OJT 이력 있음</span>
                        ) : (
                          <span className="text-xs text-rose-400 flex items-center gap-1">❌ 현장교육(OJT) 미실시</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-2">
                      {item.suggestInHouse && (
                        <div className="flex items-start gap-2 bg-indigo-500/5 border border-indigo-500/20 p-2 rounded-lg">
                          <BookOpen className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-indigo-300 block">[사내교육 제안]</span>
                            <span className="text-xs text-slate-300">공개교육 신뢰도 기반 맞춤형 사내 위탁연수 도입 영업 추천</span>
                          </div>
                        </div>
                      )}
                      {item.suggestOjt && (
                        <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 p-2 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-amber-300 block">[현장교육(OJT) 제안]</span>
                            <span className="text-xs text-slate-300">현장 생산성 향상을 위한 전문 현장 OJT 교육 프로그램 추천</span>
                          </div>
                        </div>
                      )}
                      {item.suggestIso && (
                        <div className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/20 p-2 rounded-lg">
                          <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-rose-300 block">[ISO인증 심사 제안]</span>
                            <span className="text-xs text-slate-300">거래 신뢰 확보를 위한 ISO 9001/14001 인증 심사 대행 제안</span>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500 font-medium">
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
