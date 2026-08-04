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
          const salesRows = xlsx.utils.sheet_to_json<any>(workbook.Sheets[salesSheetName]);
          sales = salesRows.map((row, index) => {
            const dateVal = String(row['전기일'] || '');
            const yearStr = dateVal.substring(0, 4);
            const monthStr = dateVal.substring(4, 6);
            
            return {
              id: `sale_${index}`,
              year: parseInt(yearStr, 10) || 0,
              month: parseInt(monthStr, 10) || 0,
              dateStr: dateVal,
              department: String(row['이름'] || '').trim(),
              budgetType: String(row['예산(목)'] || '').trim(),
              materialDetails: String(row['자재내역'] || '').trim(),
              customerName: String(row['고객명'] || '').trim(),
              customerCode: String(row['고객'] || '').trim(),
              salesAmount: Number(row['매출 계']) || 0,
              ksCert: String(row['KS인증'] || '').trim().toUpperCase() === 'O',
              isoCert: String(row['ISO인증'] || '').trim().toUpperCase() === 'O',
              memberStatus: String(row['회원내역'] || '').trim(),
              branchOffice: (() => {
                const targetKey = Object.keys(row).find(k => k.includes('관할지부') || k.includes('지부') || k.includes('관할'));
                return targetKey ? String(row[targetKey] || '').trim() : '';
              })(),
            };
          }).filter(r => r.year > 0);
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
