import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { DataUploader } from './DataUploader';
import { FilterSidebar } from './FilterSidebar';
import { CumulativeGauge, AnnualGauge } from './KpiGauges';
import { YearlyCompareChart } from './YearlyCompareChart';
import { CustomerTrendChart } from './CustomerTrendChart';
import { CompareTab } from './CompareTab';
import { TreemapTab } from './TreemapTab';
import { ConsultingTab } from './ConsultingTab';
import { LayoutDashboard, Calendar, LayoutGrid, Sparkles } from 'lucide-react';

const WidgetWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col relative group overflow-hidden h-full">
    <div className="flex-1 min-h-0 w-full p-2 overflow-hidden">
      {children}
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const { isInitialLoad, salesData } = useDashboard();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'compare' | 'compare_treemap' | 'consulting'>('dashboard');

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* 경영현황 탭이고 데이터가 로드된 경우에만 사이드바 노출 */}
      {!isInitialLoad && salesData.length > 0 && activeTab === 'dashboard' && <FilterSidebar />}
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* 헤더: 고정 높이 */}
        <header className="flex-none z-10 bg-slate-50 px-6 py-3 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                2026년 전북지역본부 <span className="text-indigo-600">경영현황</span>
              </h1>
              <p className="text-slate-500 mt-1 text-sm">
                실시간 매출 현황 및 목표 달성률 대시보드
              </p>
            </div>

            {/* 탭 전환 버튼 (데이터가 업로드된 후에만 노출) */}
            {!isInitialLoad && salesData.length > 0 && (
              <div className="flex bg-slate-200/60 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutDashboard size={14} />
                  경영현황
                </button>
                <button
                  onClick={() => setActiveTab('compare')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    activeTab === 'compare'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Calendar size={14} />
                  자유 기간 비교
                </button>
                <button
                  onClick={() => setActiveTab('compare_treemap')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    activeTab === 'compare_treemap'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid size={14} />
                  트리맵 비교
                </button>
                <button
                  onClick={() => setActiveTab('consulting')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    activeTab === 'consulting'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sparkles size={14} className="text-indigo-500" />
                  AI 경영분석 & 컨설팅 제안
                </button>
              </div>
            )}
          </div>
        </header>

        {isInitialLoad || salesData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50">
            <DataUploader />
          </div>
        ) : activeTab === 'dashboard' ? (
          /* ★ CSS Grid: flex-1로 남은 공간 전부 차지, overflow-y-auto로 확대 시 스크롤 지원 */
          <div
            className="flex-1 min-h-0 w-full bg-slate-50 p-3 overflow-y-auto custom-scrollbar"
            style={{
              display: 'grid',
              gridTemplateColumns: '140px 1fr',   /* 게이지 좁은 고정 폭 : 차트 나머지 전부 */
              gridTemplateRows: '1fr 1fr',       /* 50% : 50% */
              gap: '12px',
            }}
          >
            {/* 좌상: 누적 달성률 게이지 */}
            <WidgetWrapper><CumulativeGauge /></WidgetWrapper>

            {/* 우상: 연도별 월 실적 차트 */}
            <WidgetWrapper><YearlyCompareChart /></WidgetWrapper>

            {/* 좌하: 연간 진도율 게이지 */}
            <WidgetWrapper><AnnualGauge /></WidgetWrapper>

            {/* 우하: 고객별 매출 추이 차트 */}
            <WidgetWrapper><CustomerTrendChart /></WidgetWrapper>
          </div>
        ) : activeTab === 'compare' ? (
          /* 자유 기간 비교 탭 */
          <div className="flex-1 min-h-0 w-full bg-slate-50 p-4 overflow-y-auto custom-scrollbar">
            <CompareTab />
          </div>
        ) : activeTab === 'compare_treemap' ? (
          /* 트리맵 비교 탭 */
          <div className="flex-1 min-h-0 w-full bg-slate-50 overflow-hidden">
            <TreemapTab />
          </div>
        ) : (
          /* AI 경영분석 & 컨설팅 제안 탭 */
          <div className="flex-1 min-h-0 w-full bg-slate-50 p-6 overflow-y-auto custom-scrollbar">
            <ConsultingTab />
          </div>
        )}
      </main>
    </div>
  );
};
