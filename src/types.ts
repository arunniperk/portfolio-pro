import type { CSSProperties, ReactNode } from 'react';

// ── Core Data Types ─────────────────────────────────────────────────────────

export interface Holding {
  id: number;
  symbol: string;
  name: string;
  qty: number;
  buyPrice: number;
  unpledgedQty?: number;
  sector?: string;
  purchaseDate?: string;
  notes?: string;
}

export interface HoldingRow extends Holding {
  currency: string;
  curPrice: number | null;
  invested: number;
  curValue: number | null;
  gain: number | null;
  gainPct: number | null;
  dayChange: number | null;
  dayPL: number | null;
  pfName?: string;
}

export interface Portfolio {
  id: number;
  name: string;
  holdings: Holding[];
  targets: Record<string, number>;
}

export interface PriceData {
  current: number;
  prev?: number;
  currency: string;
}

export interface StockSummaryDetail {
  trailingPE?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  beta?: number | null;
  dividendYield?: number | null;
}

export interface StockPriceInfo {
  marketCap?: number | null;
  regularMarketVolume?: number | null;
  shortName?: string | null;
  recommendationKey?: string | null;
  targetMeanPrice?: number | null;
}

export interface StockFinancialData {
  recommendationKey?: string | null;
  targetMeanPrice?: number | null;
  targetHighPrice?: number | null;
  targetLowPrice?: number | null;
  numberOfAnalystOpinions?: number | null;
}

export interface StockDefaultKeyStatistics {
  trailingEps?: number | null;
  numberOfAnalystOpinions?: number | null;
}

export interface StockSummary {
  price: StockPriceInfo;
  summaryDetail: StockSummaryDetail;
  defaultKeyStatistics: StockDefaultKeyStatistics;
  financialData: StockFinancialData;
  recommendationTrend?: unknown | null;
}

export interface HistoryPoint {
  date: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  change?: number;
}

export interface StockDetail {
  history: HistoryPoint[];
  summary: StockSummary;
  loading: boolean;
  error: string | null;
  range?: string;
}

// ── Portfolio History ───────────────────────────────────────────────────────

export interface PortfolioHistoryEntry {
  date: string;
  inrVal: number;
  inrInv: number;
  npsVal: number;
  npsInv: number;
  goldVal: number;
  goldInv: number;
  mfVal: number;
  mfInv: number;
  ppfVal: number;
  ppfInv: number;
  efVal: number;
  efInv: number;
  inrEquityVal: number;
  inrEquityInv: number;
  usdEquityVal: number;
  usdEquityInv: number;
}

// ── Alerts ──────────────────────────────────────────────────────────────────

export interface Alert {
  id?: number;
  symbol: string;
  name: string;
  price: number;
  t1: number;
  t1Hit: boolean;
  t1HitAt: string | null;
  t2: number | null;
  t2Hit: boolean;
  t2HitAt: string | null;
  triggered?: boolean;
  triggeredAt?: string | null;
}

// ── NPS ─────────────────────────────────────────────────────────────────────

export interface NPSHolding {
  pfm: string;
  e: number;
  c: number;
  g: number;
  tInv: number;
  sDate: string;
}

export interface NPSNavs {
  [key: string]: number;
}

// ── Gold ────────────────────────────────────────────────────────────────────

export interface GoldHolding {
  date: string;
  grams: number;
  invVal: number;
  note?: string;
}

// ── Mutual Funds ────────────────────────────────────────────────────────────

export interface MFHolding {
  schemeCode: number;
  name: string;
  units: number;
  invVal: number;
  date: string;
}

// ── PPF ─────────────────────────────────────────────────────────────────────

export interface PPFHolding {
  date: string;
  amount: number;
  isInterest?: boolean;
}

// ── Emergency Fund ──────────────────────────────────────────────────────────

export interface EmergencyFundHolding {
  bank: string;
  holder?: string;
  amount: number;
}

// ── Tweaks / Settings ───────────────────────────────────────────────────────

export interface Tweaks {
  darkMode: boolean;
  compactRows: boolean;
  showCharts: boolean;
  autoRefreshMins: number;
  pin: string;
  glowIntensity: number;
}

// ── AI Assessment ───────────────────────────────────────────────────────────

export interface PortfolioAssessment {
  date?: string;
  health: number | string;
  summary: string;
  keyInsight: string;
  topPick: string;
  topWorry: string;
  advice: string;
  timestamp?: number;
}

// ── Feature: Goals ──────────────────────────────────────────────────────────

export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  notes?: string;
}

// ── Feature: Dividends ──────────────────────────────────────────────────────

export interface DividendRecord {
  id: number;
  symbol: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
  exDate: string;
  payDate: string;
}

// ── Feature: Rebalance ──────────────────────────────────────────────────────

export interface RebalanceTarget {
  symbol?: string;
  sector?: string;
  targetPct: number;
}

// ── Feature: Reminders (Tax) ────────────────────────────────────────────────

export interface PortfolioReminder {
  id: number;
  title: string;
  date: string;
  note: string;
  recurring: 'none' | 'weekly' | 'monthly' | 'yearly';
}

// ── Feature: Compare ────────────────────────────────────────────────────────

export interface CompareData {
  symbol: string;
  name: string;
  curPrice: number | null;
  currency: string;
  dayChg: number | null;
  yrReturn: number | null;
  pe: number | null | undefined;
  eps: number | null | undefined;
  beta: number | null | undefined;
  marketCap: number | null | undefined;
  divYield: number | null;
  high52: number | null | undefined;
  low52: number | null | undefined;
  target: number | null | undefined;
  recommendation: string | null | undefined;
  loading?: boolean;
}

// ── AI Analysis (per-stock) ─────────────────────────────────────────────────

export interface AIAnalysisData {
  overview: string;
  sentiment: string;
  performance: string;
  opportunities: string[];
  risks: string[];
  positionComment: string | null;
  disclaimer: string;
}

export interface AIAnalysisResult {
  loading: boolean;
  data: AIAnalysisData | null;
  error: string | null;
  provider: string | null;
}

// ── Theme ───────────────────────────────────────────────────────────────────

export interface Theme {
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  surface4: string;
  sidebar: string;
  text: string;
  text2: string;
  text3: string;
  text4: string;
  accent: string;
  accentDim: string;
  accentBg: string;
  accentBg2: string;
  success: string;
  successBg: string;
  danger: string;
  dangerBg: string;
  warning: string;
  warnBg: string;
  border: string;
  border2: string;
  cyan: string;
  usColor: string;
  inColor: string;
  r: number;
  glow: string;
  shadow: string;
  shadowLg: string;
  transition: string;
  transitionSlow: string;
  radiusSm: number;
  radiusLg: number;
  fontXs: number;
  fontSm: number;
  fontMd: number;
  fontLg: number;
  fontXl: number;
  font2Xl: number;
}

// ── Component Prop Types ────────────────────────────────────────────────────

export interface BaseProps {
  T: Theme;
  onClose?: () => void;
}

export interface SectionProps extends BaseProps {
  title: string;
  flag: string;
  accent: string;
  rows: HoldingRow[];
  currency: string;
  usdInr?: number | null;
  onImportCSV: () => void;
  onRowClick: (symbol: string) => void;
  fetchPrices: () => Promise<void>;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  onSaveUnpledged: (id: number, val: number | null) => void;
  onSaveUpdates: (id: number, updates: Partial<Holding>) => void;
  onRemove: (id: number) => void;
  compact?: boolean;
  addHolding: (h: Holding) => void;
}

export interface StockDetailViewProps extends BaseProps {
  symbol: string;
  holding: HoldingRow | undefined;
  detail: StockDetail | undefined;
  prices: Record<string, PriceData>;
  targets: Record<string, number>;
  onSaveTarget: (id: number, val: number | null) => void;
  onRefresh: () => void;
  onRangeChange: (sym: string, range: string) => void;
  groqKey: string;
  geminiKey: string;
  primaryAI: string;
  aiAnalysis: AIAnalysisResult | undefined;
  onAIRefresh: (provider: string) => void;
}

export interface MarketDashboardProps extends BaseProps {
  rows: HoldingRow[];
  prices: Record<string, PriceData>;
  usdInr: number | null;
  holdings: Holding[];
}

export interface RebalanceToolProps extends BaseProps {
  rows: HoldingRow[];
  prices: Record<string, PriceData>;
  usdInr: number | null;
}

export interface DividendTrackerProps extends BaseProps {
  holdings: Holding[];
  prices: Record<string, PriceData>;
}

export interface TaxOptimizerProps extends BaseProps {
  rows: HoldingRow[];
}

export interface StockCompareProps extends BaseProps {
  prices: Record<string, PriceData>;
  allHoldings: HoldingRow[];
  stockDetails: Record<string, StockDetail>;
  fetchStockDetail: (symbol: string, range?: string) => void;
}

export interface ExportModuleProps extends BaseProps {
  portfolios: Portfolio[];
  prices: Record<string, PriceData>;
}

export interface SplitAdjusterProps extends BaseProps {
  holdings: Holding[];
  onSaveUpdates: (id: number, updates: Partial<Holding>) => void;
}

export interface GoalPlannerProps extends BaseProps {}

export interface SettingsPanelProps extends BaseProps {
  tweaks: Tweaks;
  onUpdate: (key: string, value: unknown) => void;
  groqKey: string;
  geminiKey: string;
  primaryAI: string;
  onSaveAIKeys: (groq: string, gemini: string, primary: string) => void;
  goldApiKey: string;
  setGoldApiKey: (key: string) => void;
}

export interface PortfolioTabsProps {
  portfolios: Portfolio[];
  activeId: number;
  onSwitch: (id: number) => void;
  onAdd: () => void;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  T: Theme;
}

export interface BottomNavProps {
  activeId: string;
  activeModule: string | null;
  onSwitch: (id: string) => void;
  T: Theme;
}

export interface SidebarContentProps {
  sRows: HoldingRow[];
  pie: { name: string; value: number }[];
  currency: string;
  usdInr?: number | null;
  invAmt: number;
  totalAmt: number;
  gain: number;
  dayGain: number;
  offset: number;
  T: Theme;
  activePf: Portfolio | undefined;
  tweaks: Tweaks;
}

// ── Nav Item ────────────────────────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  flag: string;
  color: string;
}

export interface ModNavItem {
  id: string;
  label: string;
  icon: string;
  color: string;
}
