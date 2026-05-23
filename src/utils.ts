import type { Theme } from './types';

export const isUS    = (s: string): boolean => !s.endsWith('.NS') && !s.endsWith('.BO');
export const short   = (s: string): string => s.replace('.NS','').replace('.BO','');
export const fmtQty  = (v: number | null | undefined): string => v==null?'—':parseFloat(v.toFixed(8)).toString();

export const fmt = (v: number | null | undefined, cur = 'INR'): string => {
  if(v==null||isNaN(v))return'—';
  return(cur==='USD'?'$':'₹')+Math.abs(v).toLocaleString(cur==='USD'?'en-US':'en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
};

export const fmtDual = (v: number | null | undefined, fx: number | null | undefined): string => {
  if(v==null||isNaN(v)||!fx) return fmt(v,'USD');
  const sign=v>=0?'+':'−';
  const abs=Math.abs(v);
  const usd=`${sign}$${abs.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const inr=`₹${(abs*fx).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:0})}`;
  return `${usd}  ≈ ${inr}`;
};

export const fmtBig = (v: number | null | undefined, cur = 'INR'): string => {
  if(v==null||isNaN(v))return'—';
  const s=cur==='USD'?'$':'₹';
  if(cur==='USD'){
    if(Math.abs(v)>=1e12)return`${s}${(v/1e12).toFixed(2)}T`;
    if(Math.abs(v)>=1e9) return`${s}${(v/1e9).toFixed(2)}B`;
    if(Math.abs(v)>=1e6) return`${s}${(v/1e6).toFixed(2)}M`;
    return fmt(v,cur);
  }
  if(Math.abs(v)>=1e12)return`${s}${(v/1e12).toFixed(2)}T`;
  if(Math.abs(v)>=1e9) return`${s}${(v/1e9).toFixed(2)}B`;
  if(Math.abs(v)>=1e7) return`${s}${(v/1e7).toFixed(2)}Cr`;
  if(Math.abs(v)>=1e5) return`${s}${(v/1e5).toFixed(2)}L`;
  return fmt(v,cur);
};

export const fmtPct  = (v: number | null | undefined): string => v==null||isNaN(v)?'—':`${v>=0?'+':''}${v.toFixed(2)}%`;
export const gColor  = (v: number | null | undefined, T: Theme): string => v==null||isNaN(v)?T.text2:v>=0?T.success:T.danger;

export const sortRows = <T extends Record<string, unknown>>(rows: T[], col: string, dir: 'asc' | 'desc'): T[] => [...rows].sort((a,b)=>{
  let va: any=a[col],vb: any=b[col];
  if(va==null&&vb==null)return 0;if(va==null)return dir==='asc'?1:-1;if(vb==null)return dir==='asc'?-1:1;
  if(typeof va==='string')va=va.toLowerCase();if(typeof vb==='string')vb=vb.toLowerCase();
  return dir==='asc'?(va<vb?-1:va>vb?1:0):(va>vb?-1:va<vb?1:0);
});

export interface SearchQuote {
  symbol: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchange?: string;
}

export async function yahooSearch(query: string): Promise<SearchQuote[]> {
  const quotes: SearchQuote[] = [];
  for (const host of ['query1','query2']) {
    try {
      const res = await fetch(
        `https://${host}.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&lang=en-US`,
        { headers: { Accept: 'application/json' } }
      );
      if (res.ok) {
        const json = await res.json();
        const found = (json?.quotes ?? []).filter((r: SearchQuote) => r.symbol && r.quoteType !== 'OPTION').slice(0, 7);
        if (found.length) return found;
      }
    } catch { /* fallback to next host */ }
  }
  return quotes;
}

export interface CashFlow {
  date: number;
  amount: number;
}

export const xirr = (cashFlows: CashFlow[] | null | undefined): number => {
  if (!cashFlows || cashFlows.length < 2) return 0;
  const maxIterations = 100;
  const precision = 1e-7;
  const sorted = [...cashFlows].sort((a,b)=>a.date-b.date);
  let rate = 0.1;
  const seeds = [0.1, 0.05, 0.15, 0, -0.05];
  for (const seed of seeds) {
    rate = seed;
    for (let i = 0; i < maxIterations; i++) {
      let f = 0;
      let df = 0;
      for (const cf of sorted) {
        const years = (cf.date - sorted[0].date) / (1000 * 60 * 60 * 24 * 365.25);
        const factor = Math.pow(1 + rate, years);
        f += cf.amount / factor;
        df -= (years * cf.amount) / (factor * (1 + rate));
      }
      if (Math.abs(f) < precision) return rate * 100;
      if (Math.abs(df) < precision) break;
      const nextRate = rate - f / df;
      if (Math.abs(nextRate - rate) < precision) return nextRate * 100;
      rate = nextRate;
      if (isNaN(rate) || !isFinite(rate)) break;
    }
  }
  return rate * 100;
};
