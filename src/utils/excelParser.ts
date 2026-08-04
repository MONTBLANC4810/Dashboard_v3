import * as xlsx from 'xlsx';
import type { SalesRecord, TargetRecord } from '../types';

export const parseExcelData = async (file: File): Promise<{ sales: SalesRecord[], targets: TargetRecord[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = xlsx.read(data, { type: 'array' });
        
        let sales: SalesRecord[] = [];
        let targets: TargetRecord[] = [];

        // Parse Sales Sheet
        const salesSheetName = workbook.SheetNames[0]; // '2021년~현재 개별매출현황'
        if (salesSheetName) {
          const sheet = workbook.Sheets[salesSheetName];
          // 원시 2차원 배열 형태로 추출 (빈 셀로 인해 컬럼 밀림 현상 방지)
          const rawRows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          
          if (rawRows.length > 0) {
            const headerRow = rawRows[0]; // 첫 번째 행 (헤더 목록)

            // 각 열의 한글 이름 매칭을 통해 인덱스 추적
            const getIndex = (names: string[]) => {
              return headerRow.findIndex(cell => {
                const s = String(cell || '').trim();
                return names.some(n => s.includes(n));
              });
            };

            const dateIdx = getIndex(['전기일']);
            const nameIdx = getIndex(['이름']);
            const budgetIdx = getIndex(['예산(목)']);
            const materialIdx = getIndex(['자재내역']);
            const customerIdx = getIndex(['고객명']);
            const codeIdx = getIndex(['고객']);
            const salesIdx = getIndex(['매출 계', '매출액']);
            const ksIdx = getIndex(['KS인증']);
            const isoIdx = getIndex(['ISO인증']);
            const memberIdx = getIndex(['회원내역']);
            
            // 관할지부의 경우 매칭 실패 시 가장 마지막 열(가장 우측)을 강제 지정
            let branchIdx = getIndex(['관할지부', '지부', '관할']);
            if (branchIdx === -1) {
              branchIdx = headerRow.length - 1;
            }

            sales = rawRows.slice(1).map((row, index) => {
              const dateVal = dateIdx !== -1 ? String(row[dateIdx] || '') : '';
              const yearStr = dateVal.substring(0, 4);
              const monthStr = dateVal.substring(4, 6);

              return {
                id: `sale_${index}`,
                year: parseInt(yearStr, 10) || 0,
                month: parseInt(monthStr, 10) || 0,
                dateStr: dateVal,
                department: nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '',
                budgetType: budgetIdx !== -1 ? String(row[budgetIdx] || '').trim() : '',
                materialDetails: materialIdx !== -1 ? String(row[materialIdx] || '').trim() : '',
                customerName: customerIdx !== -1 ? String(row[customerIdx] || '').trim() : '',
                customerCode: codeIdx !== -1 ? String(row[codeIdx] || '').trim() : '',
                salesAmount: salesIdx !== -1 ? Number(row[salesIdx]) || 0 : 0,
                ksCert: ksIdx !== -1 ? String(row[ksIdx] || '').trim().toUpperCase() === 'O' : false,
                isoCert: isoIdx !== -1 ? String(row[isoIdx] || '').trim().toUpperCase() === 'O' : false,
                memberStatus: memberIdx !== -1 ? String(row[memberIdx] || '').trim() : '',
                branchOffice: branchIdx !== -1 ? String(row[branchIdx] || '').trim() : '',
              };
            }).filter(r => r.year > 0);
          }
        }

        // Parse Targets Sheet
        const targetSheetName = workbook.SheetNames.find(s => s.includes('목표')) || workbook.SheetNames[1];
        if (targetSheetName) {
          const targetRows = xlsx.utils.sheet_to_json<any>(workbook.Sheets[targetSheetName]);
          targets = targetRows.map(row => {
            const yStr = String(row['연도'] || '').replace(/[^0-9]/g, '');
            const mStr = String(row['월'] || '').replace(/[^0-9]/g, '');
            return {
              year: parseInt(yStr, 10) || 0,
              month: parseInt(mStr, 10) || 0,
              targetAmount: Number(row['매출목표']) || 0,
            };
          }).filter(r => r.year > 0);
        }

        resolve({ sales, targets });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
