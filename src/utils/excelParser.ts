import * as xlsx from 'xlsx';
import type { SalesRecord, TargetRecord } from '../types';

const normalizeHeader = (value: unknown): string => String(value ?? '').replace(/\s+/g, '');

const parseDateValue = (value: unknown): string => {
  let dateStr = '';

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Number.isInteger(value) && /^\d{8}$/.test(String(value))) {
      // 구ERP는 YYYYMMDD를 숫자형 셀로 저장합니다.
      dateStr = String(value);
    } else {
      // Excel 날짜 일련번호는 1899-12-30을 기준으로 날짜 부분만 사용합니다.
      const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 24 * 60 * 60 * 1000);
      if (!Number.isNaN(date.getTime())) {
        dateStr = `${String(date.getUTCFullYear()).padStart(4, '0')}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
      }
    }
  } else {
    const rawValue = String(value ?? '').trim();
    const formattedDate = rawValue.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    dateStr = formattedDate
      ? `${formattedDate[1]}${formattedDate[2].padStart(2, '0')}${formattedDate[3].padStart(2, '0')}`
      : rawValue;
  }

  if (!/^\d{8}$/.test(dateStr)) return '';

  const year = Number(dateStr.slice(0, 4));
  const month = Number(dateStr.slice(4, 6));
  const day = Number(dateStr.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    year < 1900 ||
    month < 1 || month > 12 ||
    day < 1 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) return '';

  return dateStr;
};

/** ArrayBuffer 또는 Uint8Array에서 엑셀 통합 문서를 파싱합니다. */
export const parseExcelDataFromBuffer = (data: ArrayBuffer | Uint8Array): { sales: SalesRecord[], targets: TargetRecord[] } => {
  const workbook = xlsx.read(data, { type: 'array' });
  let sales: SalesRecord[] = [];
  let targets: TargetRecord[] = [];

  // Parse Sales Sheet
  const salesSheetName = workbook.SheetNames[0]; // '2021년~현재 개별매출현황'
  if (salesSheetName) {
    const sheet = workbook.Sheets[salesSheetName];
    // 원시 2차원 배열 형태로 추출 (빈 셀로 인해 컬럼 밀림 현상 방지)
    const rawRows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

    if (rawRows.length > 0) {
      const headerRow = rawRows[0] ?? [];

      // 별칭 우선순위대로, 공백 제거 후 헤더 전체가 일치하는 열을 찾습니다.
      const getIndex = (names: string[]) => {
        for (const name of names) {
          const normalizedName = normalizeHeader(name);
          const index = headerRow.findIndex(cell => normalizeHeader(cell) === normalizedName);
          if (index !== -1) return index;
        }
        return -1;
      };

      const dateIdx = getIndex(['전기일']);
      const departmentIdx = getIndex(['손익센터명', '이름', '손익센터']);
      const budgetIdx = getIndex(['사업범주 3(목)', '사업범주3(목)', '사업범주', '예산(목)', '예산']);
      const materialIdx = getIndex(['사업코드명', '자재내역']);
      const customerNameIdx = getIndex(['고객명']);
      const customerCodeIdx = getIndex(['고객', '고객코드']);
      const salesAmountIdx = getIndex(['매출계', '매출액']);
      const ksIdx = getIndex(['KS인증']);
      const isoIdx = getIndex(['ISO인증']);
      const memberIdx = getIndex(['회원내역']);
      const branchIdx = getIndex(['관할지부', '지부', '관할']);

      sales = rawRows.slice(1).map((row, index) => {
        const dateStr = parseDateValue(dateIdx !== -1 ? row[dateIdx] : '');
        const salesValue = salesAmountIdx !== -1 ? row[salesAmountIdx] : undefined;
        const salesAmount = typeof salesValue === 'number'
          ? salesValue
          : Number(String(salesValue || '').replace(/,/g, '').trim()) || 0;

        return {
          id: `sale_${index}`,
          year: dateStr ? Number(dateStr.slice(0, 4)) : 0,
          month: dateStr ? Number(dateStr.slice(4, 6)) : 0,
          dateStr,
          department: departmentIdx !== -1 ? String(row[departmentIdx] || '').trim() : '',
          budgetType: budgetIdx !== -1 ? String(row[budgetIdx] || '').trim() : '',
          materialDetails: materialIdx !== -1 ? String(row[materialIdx] || '').trim() : '',
          customerName: customerNameIdx !== -1 ? String(row[customerNameIdx] || '').trim() : '',
          customerCode: customerCodeIdx !== -1 ? String(row[customerCodeIdx] || '').trim() : '',
          salesAmount,
          ksCert: ksIdx !== -1 ? String(row[ksIdx] || '').trim().toUpperCase() === 'O' : false,
          isoCert: isoIdx !== -1 ? String(row[isoIdx] || '').trim().toUpperCase() === 'O' : false,
          memberStatus: memberIdx !== -1 ? String(row[memberIdx] || '').trim() : '',
          branchOffice: branchIdx !== -1 ? String(row[branchIdx] || '').trim() : '',
        };
      }).filter(record => record.year > 0);
    }
  }

  // Parse Targets Sheet
  const targetSheetName = workbook.SheetNames.find(name => name.includes('목표')) || workbook.SheetNames[1];
  if (targetSheetName) {
    const targetRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[targetSheetName]);
    targets = targetRows.map(row => {
      const yearStr = String(row['연도'] || '').replace(/[^0-9]/g, '');
      const monthStr = String(row['월'] || '').replace(/[^0-9]/g, '');
      return {
        year: parseInt(yearStr, 10) || 0,
        month: parseInt(monthStr, 10) || 0,
        targetAmount: Number(row['매출목표']) || 0,
      };
    }).filter(record => record.year > 0);
  }

  return { sales, targets };
};

export const parseExcelData = async (file: File): Promise<{ sales: SalesRecord[], targets: TargetRecord[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        resolve(parseExcelDataFromBuffer(data));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
