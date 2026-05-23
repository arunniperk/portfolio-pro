import { callAI, extractJSON } from '../ai';
import { getItemSync, setItemSync } from '../storage';
import { isUS } from '../utils';
import type { Portfolio, PriceData, PortfolioAssessment } from '../types';

const LAST_ASSESS_KEY = 'pm_last_assessment';
const ASSESS_RESULT_KEY = 'pm_assessment_result';

interface HoldingSummary {
  symbol: string;
  name: string;
  qty: number;
  buyPrice: number;
  curPrice: number | null;
  invested: number;
  value: number | null;
  gain: number | null;
  gainPct: number | null;
  currency: string;
}

export async function runDailyAssessment(
  portfolios: Portfolio[],
  prices: Record<string, PriceData>,
  groqKey: string,
  geminiKey: string,
  primaryAI: string
): Promise<PortfolioAssessment | null> {
  if (!groqKey && !geminiKey) return null;
  const today = new Date().toISOString().slice(0, 10);
  const lastRun = getItemSync(LAST_ASSESS_KEY);
  if (lastRun === today) {
  try { return JSON.parse(getItemSync(ASSESS_RESULT_KEY) || 'null') as PortfolioAssessment | null; }
    catch { return null; }
  }

  const allHoldings: HoldingSummary[] = portfolios.flatMap(p => p.holdings.map(h => {
    const pr = prices[h.symbol];
    const curPrice = pr?.current ?? null;
    const curVal = curPrice != null ? curPrice * h.qty : null;
    const invVal = h.buyPrice * h.qty;
    const gain = curVal != null ? curVal - invVal : null;
    const gainPct = gain != null && invVal > 0 ? (gain / invVal) * 100 : null;
    return {
      symbol: h.symbol.replace('.NS', '').replace('.BO', ''),
      name: h.name,
      qty: h.qty,
      buyPrice: h.buyPrice,
      curPrice,
      invested: invVal,
      value: curVal,
      gain,
      gainPct,
      currency: pr?.currency || (isUS(h.symbol) ? 'USD' : 'INR'),
    };
  })).filter(Boolean) as HoldingSummary[];

  if (allHoldings.length === 0) return null;

  const totalInv = allHoldings.reduce((s, h) => s + h.invested, 0);
  const totalVal = allHoldings.reduce((s, h) => s + (h.value || 0), 0);
  const totalGain = totalVal - totalInv;
  const gainPct = totalInv > 0 ? (totalGain / totalInv) * 100 : 0;
  const winners = allHoldings.filter(h => (h.gain || 0) > 0).length;
  const losers = allHoldings.filter(h => (h.gain || 0) < 0).length;
  const topWinner = allHoldings.sort((a, b) => (b.gainPct || 0) - (a.gainPct || 0))[0];
  const topLoser = allHoldings.sort((a, b) => (a.gainPct || 0) - (b.gainPct || 0))[0];
  const inrHoldings = allHoldings.filter(h => h.currency === 'INR');
  const usdHoldings = allHoldings.filter(h => h.currency === 'USD');

  const summaryStr = `Portfolio Summary:
- Total holdings: ${allHoldings.length}
- Invested: ₹${totalInv.toLocaleString('en-IN', {maximumFractionDigits:0})}
- Current Value: ₹${totalVal.toLocaleString('en-IN', {maximumFractionDigits:0})}
- P&L: ${totalGain >= 0 ? '+' : '-'}₹${Math.abs(totalGain).toLocaleString('en-IN', {maximumFractionDigits:0})} (${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(2)}%)
- Winners: ${winners} | Losers: ${losers}
- Best: ${topWinner?.symbol || 'N/A'} (${topWinner?.gainPct?.toFixed(1) || '0'}%)
- Worst: ${topLoser?.symbol || 'N/A'} (${topLoser?.gainPct?.toFixed(1) || '0'}%)
- Indian stocks: ${inrHoldings.length} | US stocks: ${usdHoldings.length}`;

  const prompt = `You are a professional portfolio analyst. Provide a brief daily assessment of this portfolio. Keep it under 150 words.

${summaryStr}

Respond ONLY as a JSON object:
{
  "date": "${today}",
  "health": "Good|Fair|Needs Attention",
  "summary": "2-3 sentence assessment",
  "keyInsight": "One key observation",
  "topPick": "stock symbol of best performer",
  "topWorry": "stock symbol of most concerning",
  "advice": "One actionable suggestion"
}`;

  try {
    const { text } = await callAI(groqKey, geminiKey, primaryAI, prompt);
    const data = extractJSON(text);
    if (data) {
      setItemSync(ASSESS_RESULT_KEY, JSON.stringify({ ...data, timestamp: Date.now() }));
      setItemSync(LAST_ASSESS_KEY, today);
      return data as unknown as PortfolioAssessment;
    }
  } catch {}
  return null;
}

export function getCachedAssessment(): PortfolioAssessment | null {
  try { return JSON.parse(getItemSync(ASSESS_RESULT_KEY) || 'null'); }
  catch { return null; }
}
