export interface SalesRecord {
  id: string;
  year: number;
  month: number;
  dateStr: string;
  department: string; // 이름
  budgetType: string; // 예산(목)
  materialDetails?: string; // 자재내역
  customerName: string; // 고객명
  customerCode: string; // 고객
  salesAmount: number; // 매출 계
  ksCert: boolean; // KS인증 (O/X)
  isoCert: boolean; // ISO인증 (O/X)
  memberStatus: string; // 회원내역
  branchOffice?: string; // 관할지부
}

export interface TargetRecord {
  year: number;
  month: number;
  targetAmount: number;
}

export interface FilterState {
  years: number[];
  months: number[];
  departments: string[];
  budgetTypes: string[];
  customers: string[];
  ksCert: boolean | null;
  isoCert: boolean | null;
  memberStatuses: string[];
  showTarget2026: boolean;
}
