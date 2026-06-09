// ─── Auth ─────────────────────────────────────
export type Role =
  | "SUPER_ADMIN" | "PASTOR" | "TREASURER"
  | "HOD" | "SECRETARY" | "AUDITOR" | "WORKER" | "MEMBER";

export interface AuthUser {
  id:           string;
  email:        string;
  role:         Role;
  memberId?:    string;
  firstName?:   string;
  lastName?:    string;
  profilePhoto?:string;
}

export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
  user:         AuthUser;
}

// ─── Members ──────────────────────────────────
export type Gender        = "MALE" | "FEMALE";
export type MemberStatus  = "ACTIVE" | "INACTIVE" | "VISITOR" | "NEW_CONVERT" | "TRANSFERRED_IN" | "TRANSFERRED_OUT";
export type WorkerStatus  = "NONE" | "WORKER_IN_TRAINING" | "WORKER" | "DEPARTMENT_HEAD" | "PASTOR";
export type BaptismStatus = "NOT_BAPTISED" | "BAPTISED";

export interface Member {
  id:                  string;
  memberId:            string;
  firstName:           string;
  lastName:            string;
  otherNames?:         string;
  phone:               string;
  phone2?:             string;
  email?:              string;
  gender:              Gender;
  dateOfBirth?:        string;
  weddingAnniversary?: string;
  profilePhoto?:       string;
  address?:            string;
  status:              MemberStatus;
  workerStatus:        WorkerStatus;
  baptismStatus:       BaptismStatus;
  baptismDate?:        string;
  foundationSchool:    boolean;
  isFirstTimer:        boolean;
  isNewConvert:        boolean;
  zone?:               string;
  area?:               string;
  province?:           string;
  houseFellowshipId?:  string;
  departmentId?:       string;
  joinedDate:          string;
  notes?:              string;
  createdAt:           string;
  department?:         { id: string; name: string };
  houseFellowship?:    { id: string; name: string };
}

export interface MemberStats {
  total:        number;
  active:       number;
  workers:      number;
  newConverts:  number;
  baptised:     number;
  unbaptised:   number;
  men:          number;
  women:        number;
  newThisMonth: number;
}

// ─── Finance ──────────────────────────────────
export type TransactionType  = "INCOME" | "EXPENSE" | "TRANSFER";
export type PaymentMethod    = "CASH" | "BANK_TRANSFER" | "POS" | "CHEQUE" | "ONLINE";
export type IncomeCategory   =
  | "TITHE" | "MINISTERS_TITHE" | "SUNDAY_LOVE_OFFERING" | "THANKSGIVING"
  | "CRM" | "CHILDREN_TEENS_OFFERING" | "TRUST_FRUIT" | "FIRST_BORN_REDEMPTION"
  | "GOSPEL_FUND" | "HOUSE_FELLOWSHIP_OFFERING" | "BUILDING_FUND" | "WELFARE"
  | "SPECIAL_DONATION" | "PARTNERSHIP_SEED" | "CONVENTION_LEVY" | "RUN" | "CSR" | "OTHER_INCOME";
export type ExpenseCategory  =
  | "FUEL" | "WELFARE_PAYMENT" | "RENT" | "SOUND_EQUIPMENT" | "SALARY_STIPEND"
  | "MEDIA" | "DECORATION" | "TRANSPORTATION" | "INTERNET" | "MAINTENANCE"
  | "PRINTING" | "STATIONERY" | "REFRESHMENT" | "TITHE_REMITTANCE" | "OTHER_EXPENSE";

export interface Transaction {
  id:               string;
  reference:        string;
  type:             TransactionType;
  incomeCategory?:  IncomeCategory;
  expenseCategory?: ExpenseCategory;
  amount:           number;
  description:      string;
  paymentMethod:    PaymentMethod;
  transactionDate:  string;
  memberId?:        string;
  isRemitted:       boolean;
  remittanceAmount?:number;
  createdAt:        string;
  member?:          { id: string; firstName: string; lastName: string };
}

export interface FinanceSummary {
  period:           { month: number; year: number };
  totalIncome:      number;
  totalExpenses:    number;
  netSurplus:       number;
  totalRemitted:    number;
  parishRetained:   number;
  incomeBreakdown:  { category: string; amount: number }[];
  expenseBreakdown: { category: string; amount: number }[];
}

export interface IncomeConfig {
  id:                string;
  category:          string;
  remittancePercent: number;
  isActive:          boolean;
  createdAt:         string;
}

// ─── Attendance ───────────────────────────────
export type ServiceType =
  | "SUNDAY_MORNING" | "SUNDAY_EVENING" | "TUESDAY" | "THURSDAY"
  | "FRIDAY" | "SATURDAY" | "DIGGING_DEEP" | "FAITH_CLINIC"
  | "YOUTH_SERVICE" | "CHILDREN_SERVICE" | "HOUSE_FELLOWSHIP" | "SPECIAL_SERVICE";

export interface AttendanceSession {
  id:                   string;
  serviceDate:          string;
  serviceType:          ServiceType;
  preacher?:            string;
  menCount:             number;
  womenCount:           number;
  childrenCount:        number;
  totalCount:           number;
  sundaySchoolCount:    number;
  houseFellowshipCount: number;
  notes?:               string;
  createdAt:            string;
  presentCount?:        number;
}

export interface AttendanceSummary {
  period:           { month: number; year: number };
  totalSessions:    number;
  overallAvg:       number;
  highestAttendance:{ count: number; date: string; service: string };
  byServiceType:    Record<string, { count: number; total: number; avg: number }>;
}

// ─── Departments ──────────────────────────────
export interface Department {
  id:           string;
  name:         string;
  description?: string;
  hodId?:       string;
  budget:       number;
  isActive:     boolean;
  memberCount:  number;
  spent:        number;
  remaining:    number;
  budgetUsedPct:number;
  hod?:         { id: string; firstName: string; lastName: string };
}

// ─── Returns ──────────────────────────────────
export type ReturnStatus = "DRAFT" | "SUBMITTED" | "ACKNOWLEDGED" | "QUERIED";

export interface MonthlyReturn {
  id:                    string;
  month:                 number;
  year:                  number;
  status:                ReturnStatus;
  submittedAt?:          string;
  acknowledgedAt?:       string;
  // Computed totals (populated by API)
  totalIncome:           number;
  totalExpenses:         number;
  netSurplus:            number;
  totalRemitted:         number;
  parishRetained:        number;
  avgAttendance?:        number;
  incomeBreakdown?:      { category: string; amount: number }[];
  // Legacy / raw fields
  totalTithe?:           number;
  totalSundayOffering?:  number;
  totalThanksgiving?:    number;
  totalRemittance?:      number;
  avgSundayAttendance?:  number;
  avgMidweekAttendance?: number;
  newConverts?:          number;
  waterBaptism?:         number;
  totalActiveMembers?:   number;
  notes?:                string;
}

// ─── Pagination ───────────────────────────────
export interface Paginated<T> {
  data:       T[];
  pagination: {
    page:       number;
    limit:      number;
    total:      number;
    totalPages: number;
    hasNext:    boolean;
    hasPrev:    boolean;
  };
}
