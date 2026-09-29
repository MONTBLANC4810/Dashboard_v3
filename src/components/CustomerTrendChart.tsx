import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDashboard } from '../context/DashboardContext';
import { formatKoreanCurrencyCompact } from '../utils/formatters';

export const CustomerTrendChart: React.FC = () => {
  const { filteredSales } = useDashboard();
  const [topLimit, setTopLimit] = useState(10); // 10, 20, 30
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  const chartData = useMemo(() => {
    const dataMap: Record<string, any> = {};

    filteredSales.forEach(r => {
      const timeKey = `${r.year}-${String(r.month).padStart(2, '0')}`;
      if (!dataMap[timeKey]) {
        dataMap[timeKey] = { time: timeKey, timestamp: r.year * 100 + r.month };
      }
      if (dataMap[timeKey][r.customerName] === undefined) {
        dataMap[timeKey][r.customerName] = 0;
        dataMap[timeKey][`${r.customerName}_real`] = 0;
        dataMap[timeKey][`${r.customerName}_maxSale`] = r;
      } else {
        if (r.salesAmount > dataMap[timeKey][`${r.customerName}_maxSale`].salesAmount) {
          dataMap[timeKey][`${r.customerName}_maxSale`] = r;
        }
      }
      // 양수/음수 모두 더해서 실제 총계를 계산 (표, 차트 보존용 각각 저장)
      dataMap[timeKey][r.customerName] += r.salesAmount;
      dataMap[timeKey][`${r.customerName}_real`] += r.salesAmount;
    });

    // 월별 최종 합산액이 마이너스인 경우 그래프에서 표시하지 않음 (null 처리)
    Object.values(dataMap).forEach((monthData: any) => {
      Object.keys(monthData).forEach(key => {
        // _real 키가 아닌 그래프용 데이터만 음수를 null로 치환
        if (key !== 'time' && key !== 'timestamp' && !key.endsWith('_real') && !key.endsWith('_maxSale') && typeof monthData[key] === 'number') {
          if (monthData[key] < 0) {
            monthData[key] = null;
          }
        }
      });
    });

    return Object.values(dataMap).sort((a, b: any) => a.timestamp - b.timestamp);
  }, [filteredSales]);

  const activeCustomers = useMemo(() => {
    // 렌더링 부하 방지 및 상위 N개 고객 표시
    const salesMap: Record<string, number> = {};
    filteredSales.forEach(r => {
      if (!salesMap[r.customerName]) salesMap[r.customerName] = 0;
      // 총계 기준 상위 고객 추출을 위해 여전히 전체 합산 반영
      salesMap[r.customerName] += r.salesAmount;
    });

    const sortedCustomers = Object.entries(salesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topLimit)
      .map(entry => entry[0]);

    return sortedCustomers;
  }, [filteredSales, topLimit]);

  // Extracts Quarter-ending months AND the very first/last data points for context
  const quarterlyTicks = useMemo(() => {
    if (chartData.length === 0) return undefined;
    
    const firstTime = chartData[0].time;
    const lastTime = chartData[chartData.length - 1].time;
    
    const ticks = chartData
      .map((d: any) => d.time)
      .filter((time, index) => {
        if (!time) return false;
        // 항상 시작점과 끝점은 포함 (최우선)
        if (time === firstTime || time === lastTime) return true;
        
        // 기본적으로는 분기(3,6,9,12월)만 표시
        const m = time.split('-')[1];
        if (!['03', '06', '09', '12'].includes(m)) return false;
        
        // 시작점이나 끝점과 너무 가까운 분기 레이블은 겹침 방지를 위해 생략
        const firstDist = index;
        const lastDist = (chartData.length - 1) - index;
        
        return firstDist > 1 && lastDist > 2;
      });
    return ticks.length > 0 ? ticks : undefined;
  }, [chartData]);

  const formatYAxis = (tickItem: number) => formatKoreanCurrencyCompact(tickItem);

  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full h-full">
      <div className="flex-none mb-2 px-2 pt-2 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800">고객별 매출 추이</h3>
          <p className="text-xs text-slate-500 mt-0.5">※ 점이나 선을 클릭하면 아래에 상세 표가 표시됩니다.</p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-xs font-medium text-slate-600">표시 항목:</label>
          <select 
            value={topLimit} 
            onChange={(e) => setTopLimit(Number(e.target.value))}
            className="text-xs border border-slate-300 rounded-md py-1 px-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value={10}>상위 10개</option>
            <option value={20}>상위 20개</option>
            <option value={30}>상위 30개</option>
          </select>
        </div>
      </div>
      <div className="w-full flex-1 min-h-0 relative cursor-pointer group">
        <div className="absolute inset-0 z-0 hidden group-hover:block pointer-events-none bg-slate-50/10 transition-colors"></div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 60, left: 10, bottom: 5 }} 
            onMouseMove={(e: any) => {
              if (e?.activePayload?.length > 0) setHoveredPoint(e.activePayload[0].payload);
            }}
            onMouseLeave={() => setHoveredPoint(null)}
            onClick={(e: any) => {
              if (e?.activePayload?.length > 0) {
                 setSelectedPoint(e.activePayload[0].payload);
              } else if (hoveredPoint) {
                 setSelectedPoint(hoveredPoint);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="time" 
              tick={{fill: '#64748b', fontSize: 11}} 
              ticks={quarterlyTicks}
              interval={0}
              minTickGap={10}
              padding={{ left: 30, right: 40 }}
              tickFormatter={(val) => {
                if (!val) return '';
                const parts = val.split('-');
                if (parts.length < 2) return val;
                return `'${parts[0].substring(2)}.${parts[1]}`;
              }}
              axisLine={false} 
              tickLine={false} 
            />
            <YAxis 
              domain={[0, 'auto']}
              allowDataOverflow={false}
              tickFormatter={formatYAxis} 
              tick={{fill: '#64748b', fontSize: 11}} 
              axisLine={false} 
              tickLine={false} 
              width={50} 
            />
            <Tooltip 
              content={(props) => {
                if (!props.active || !props.payload || props.payload.length === 0) return null;
                const data = props.payload[0].payload;
                const topCustomers = Object.keys(data)
                  .filter(k => k.endsWith('_real') && data[k] > 0)
                  .map(k => k.replace('_real', ''))
                  .sort((a, b) => data[`${b}_real`] - data[`${a}_real`])
                  .slice(0, topLimit);

                return (
                  <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-xs z-50">
                    <p className="font-bold text-slate-700 mb-2">{props.label}</p>
                    <div className="space-y-1.5 mt-2">
                      {topCustomers.map(c => {
                        const val = data[`${c}_real`];
                        return (
                          <div key={c} className="flex justify-between items-center gap-6">
                            <div className="flex items-center text-slate-600 font-medium">
                              <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: stringToColor(c) }}></span>
                              <span className="truncate max-w-[120px]">{c}</span>
                            </div>
                            <div className="font-semibold text-slate-800 tracking-tight text-right w-[105px]">
                              ₩ {val.toLocaleString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }}
              cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
            />
            {activeCustomers.length <= 15 && <Legend wrapperStyle={{ paddingTop: '6px', fontSize: '11px', textAlign: 'left' }} align="left" />}
            {activeCustomers.map((customer) => (
              <Line 
                key={customer}
                type="monotone"
                dataKey={customer}
                stroke={stringToColor(customer)}
                strokeWidth={2}
                dot={{ r: 2, strokeWidth: 1 }}
                activeDot={{ 
                  r: 5, 
                  onClick: (_event: any, payload: any) => {
                    if (payload && payload.payload) setSelectedPoint(payload.payload);
                  }
                }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* 선택된 월의 상세 데이터 테이블 (오버레이 모달) */}
        {selectedPoint && (
          <div className="absolute inset-1 border border-slate-200 rounded-lg overflow-hidden flex flex-col bg-white shadow-2xl z-20 transition-all duration-300">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
              <h4 className="font-semibold text-sm text-slate-700">{selectedPoint.time} 실적 상세</h4>
              <button onClick={(e) => { e.stopPropagation(); setSelectedPoint(null); }} className="text-xs font-medium text-slate-500 hover:text-red-500 transition-colors px-2 py-1 bg-white border border-slate-200 rounded shadow-sm">
                닫기 ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-0 custom-scrollbar">
              <table className="w-full text-xs text-left table-fixed">
                <thead className="bg-slate-50 sticky top-0 shadow-sm z-10 w-full">
                  <tr>
                    <th className="px-4 py-2 font-semibold text-slate-600 border-b border-slate-200 w-[26%]">고객명</th>
                    <th className="px-4 py-2 font-semibold text-slate-600 border-b border-slate-200 w-[20%]">사업부서명</th>
                    <th className="px-4 py-2 font-semibold text-slate-600 border-b border-slate-200 w-[30%]">대표 사업코드명 / 자재내역</th>
                    <th className="px-4 py-2 font-semibold text-slate-600 text-right border-b border-slate-200 w-[24%]">매출계 / 매출액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.keys(selectedPoint)
                    .filter(k => k.endsWith('_real') && selectedPoint[k] > 0)
                    .map(k => k.replace('_real', ''))
                    .sort((a, b) => selectedPoint[`${b}_real`] - selectedPoint[`${a}_real`])
                    .slice(0, topLimit)
                    .map((c) => {
                      const val = selectedPoint[`${c}_real`];
                      const maxRec = selectedPoint[`${c}_maxSale`];
                      return (
                        <tr key={c} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2 text-slate-700 font-medium truncate flex items-center" title={c}>
                            <span className="inline-block w-2 h-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: stringToColor(c) }}></span>
                            <span className="truncate">{c}</span>
                          </td>
                          <td className="px-4 py-2 text-slate-500 truncate" title={maxRec?.department}>
                            {maxRec?.department || '-'}
                          </td>
                          <td className="px-4 py-2 text-slate-500 truncate" title={maxRec?.materialDetails}>
                            {maxRec?.materialDetails || '-'}
                          </td>
                          <td className="px-4 py-2">
                            <div className="w-[110px] ml-auto text-slate-800 font-semibold tracking-tight text-right">
                              ₩ {val == null ? '-' : val.toLocaleString()}
                            </div>
                          </td>
                        </tr>
                      );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
