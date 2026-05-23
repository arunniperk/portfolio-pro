import React, { useState, useMemo, useEffect } from 'react';
import { NvBtn } from '../components/ui';
import { fmt, short, fmtPct, gColor, isUS } from '../utils';
import { getItemSync, setItemSync } from '../storage';
import { Ic } from '../icons';

const COMPARE_KEY = 'pm_compare';

export default function StockCompare({ T, allHoldings, prices, stockDetails, fetchStockDetail, onClose }) {
  const [slots, setSlots] = useState(() => {
    try { return JSON.parse(getItemSync(COMPARE_KEY) || '["","",""]'); } catch { return ['','','']; }
  });
  const [loading, setLoading] = useState({});

  useEffect(() => { setItemSync(COMPARE_KEY, JSON.stringify(slots)); }, [slots]);

  const uniqueSymbols = useMemo(() => {
    const set = new Set(allHoldings.map(h => h.symbol));
    return Array.from(set).map(s => ({ symbol: s, name: allHoldings.find(h => h.symbol === s)?.name || s }));
  }, [allHoldings]);

  const selectSlot = (idx, sym) => {
    const next = [...slots];
    next[idx] = sym;
    setSlots(next);
    if (sym && (!stockDetails[sym] || !stockDetails[sym]?.history?.length)) {
      fetchStockDetail(sym, '1y');
    }
  };

  const compareData = useMemo(() => {
    return slots.filter(Boolean).map(sym => {
      const h = allHoldings.find(x => x.symbol === sym);
      const pr = prices[sym];
      const sd = stockDetails[sym]?.summary || {};
      const hist = stockDetails[sym]?.history || [];
      const curPrice = pr?.current || h?.curPrice || null;
      const prevPrice = pr?.prev || null;
      const dayChg = curPrice && prevPrice ? ((curPrice - prevPrice) / prevPrice) * 100 : null;
      const yrReturn = hist.length > 1 ? ((hist[hist.length-1]?.close - hist[0]?.close) / hist[0]?.close) * 100 : null;
      return {
        symbol: sym,
        name: h?.name || sym,
        curPrice, currency: pr?.currency || (isUS(sym) ? 'USD' : 'INR'),
        dayChg, yrReturn,
        pe: sd?.summaryDetail?.trailingPE,
        eps: sd?.defaultKeyStatistics?.trailingEps,
        beta: sd?.summaryDetail?.beta,
        marketCap: sd?.price?.marketCap,
        divYield: sd?.summaryDetail?.dividendYield != null ? sd.summaryDetail.dividendYield * 100 : null,
        high52: sd?.summaryDetail?.fiftyTwoWeekHigh,
        low52: sd?.summaryDetail?.fiftyTwoWeekLow,
        target: sd?.financialData?.targetMeanPrice,
        recommendation: sd?.price?.recommendationKey,
        loading: stockDetails[sym]?.loading,
      };
    });
  }, [slots, allHoldings, prices, stockDetails]);

  return (
    <div className="grow scroll-y">
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
        <div className="flex-between" style={{flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Stock Comparison</div>
            <div style={{fontSize:13,color:T.text3}}>Compare up to 3 stocks side-by-side</div>
          </div>
          {onClose&&<NvBtn onClick={onClose} T={T}><Ic.X/> Close</NvBtn>}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
          {[0,1,2].map(idx => (
            <div key={idx} style={{background:T.surface2,borderRadius:8,border:`1px solid ${slots[idx]?T.accent+'40':T.border}`,padding:12}}>
              <div style={{fontSize:10,fontWeight:700,color:T.text3,textTransform:'uppercase',marginBottom:6}}>Slot {idx+1}</div>
              <select value={slots[idx]} onChange={e=>selectSlot(idx, e.target.value)} style={{width:'100%',padding:'7px 10px',background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:6,color:T.text,fontSize:12}}>
                <option value="">Select a stock…</option>
                {uniqueSymbols.map(s => <option key={s.symbol} value={s.symbol}>{short(s.symbol)} — {s.name}</option>)}
              </select>
              {slots[idx] && compareData.find(d => d.symbol === slots[idx])?.loading && (
                <div className="skeleton" style={{height:200,marginTop:8}}/>
              )}
            </div>
          ))}
        </div>

        {compareData.filter(d => d.symbol).length >= 2 && (
          <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:T.surface3}}>
                <th style={{padding:'10px 14px',textAlign:'left',color:T.text3,fontWeight:700,fontSize:11,minWidth:100}}>Metric</th>
                {compareData.filter(d=>d.symbol).map(d => (
                  <th key={d.symbol} style={{padding:'10px 14px',textAlign:'center',color:T.accent,fontWeight:700,fontSize:11}}>{short(d.symbol)}</th>
                ))}
              </tr></thead>
              <tbody>
                {[
                  {l:'Price', k:'curPrice', f:(v,d)=>v!=null?fmt(v,d.currency):'—'},
                  {l:'Day Change', k:'dayChg', f:(v)=>v!=null?fmtPct(v):'—', c:v=>gColor(v,T)},
                  {l:'1Y Return', k:'yrReturn', f:(v)=>v!=null?fmtPct(v):'—', c:v=>gColor(v,T)},
                  {l:'P/E', k:'pe', f:v=>v!=null?`${v.toFixed(2)}`:'—'},
                  {l:'EPS', k:'eps', f:v=>v!=null?`${v.toFixed(2)}`:'—'},
                  {l:'Beta', k:'beta', f:v=>v!=null?`${v.toFixed(2)}`:'—'},
                  {l:'Div Yield', k:'divYield', f:v=>v!=null?`${v.toFixed(2)}%`:'—'},
                  {l:'Mkt Cap', k:'marketCap', f:(v,d)=>v!=null?`${d.currency==='USD'?'$':'₹'}${v>=1e12?(v/1e12).toFixed(2)+'T':v>=1e9?(v/1e9).toFixed(2)+'B':v>=1e7?(v/1e7).toFixed(0)+'Cr':(v/1e5).toFixed(0)+'L'}`:'—'},
                  {l:'52W High', k:'high52', f:(v,d)=>v!=null?fmt(v,d.currency):'—'},
                  {l:'52W Low', k:'low52', f:(v,d)=>v!=null?fmt(v,d.currency):'—'},
                  {l:'Target', k:'target', f:(v,d)=>v!=null?fmt(v,d.currency):'—'},
                  {l:'Rating', k:'recommendation', f:v=>v||'—'},
                ].map((row,i) => (
                  <tr key={row.k} style={{background:i%2===0?T.surface2:T.surface3}}>
                    <td style={{padding:'8px 14px',fontWeight:700,color:T.text3,borderBottom:`1px solid ${T.border}`}}>{row.l}</td>
                    {compareData.filter(d=>d.symbol).map(d => (
                      <td key={d.symbol} style={{padding:'8px 14px',textAlign:'center',fontWeight:600,color:row.c?row.c(row[d.k]):T.text,borderBottom:`1px solid ${T.border}`}}>{row.f(row[d.k], d)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
