import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NvBtn } from '../components/ui';
import { fmt, short, isUS, fmtPct, gColor } from '../utils';
import { Ic } from '../icons';

const INDICES = [
  { sym:'^NSEI',     label:'Nifty 50',      flag:'🇮🇳', color:'#ff9800' },
  { sym:'^BSESN',    label:'Sensex',         flag:'🇮🇳', color:'#f44336' },
  { sym:'^GSPC',     label:'S&P 500',        flag:'🇺🇸', color:'#2196f3' },
  { sym:'^IXIC',     label:'NASDAQ',         flag:'🇺🇸', color:'#00bcd4' },
  { sym:'^DJI',      label:'Dow Jones',      flag:'🇺🇸', color:'#4caf50' },
  { sym:'^NSEBANK',  label:'Bank Nifty',     flag:'🇮🇳', color:'#9c27b0' },
];

function IndexCard({ data, T }) {
  if (!data) return (
    <div className="skeleton" style={{height:80,borderRadius:T.radiusSm}}/>
  );
  const chg = data.current - data.prev;
  const pct = data.prev ? (chg / data.prev) * 100 : 0;
  return (
    <div style={{background:T.surface2,borderRadius:T.radiusSm,border:`1px solid ${T.border}`,padding:'10px 14px',display:'flex',flexDirection:'column',gap:4}}>
      <div className="flex-between">
        <span style={{fontSize:11,fontWeight:700,color:T.text3}}>{data.label}</span>
        <span>{data.flag}</span>
      </div>
      <div style={{fontSize:18,fontWeight:700,color:T.text}}>{data.current?.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
      <div style={{fontSize:12,fontWeight:600,color:gColor(chg,T)}}>{chg>=0?'+':''}{chg.toFixed(2)} ({pct>=0?'+':''}{pct.toFixed(2)}%)</div>
    </div>
  );
}

export default function MarketDashboard({ T, rows, prices, usdInr, onClose, holdings }) {
  const [indices, setIndices] = useState({});
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [heatmapSort, setHeatmapSort] = useState('value');
  const heatmapRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchIndices = async () => {
      setLoading(true);
      try {
        const urls = INDICES.map(i => `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(i.sym)}?interval=1d&range=5d`);
        const results = await Promise.all(urls.map(async (url, idx) => {
          try {
            const r = await fetch(url, { headers: { Accept:'application/json' } });
            if (!r.ok) return null;
            const j = await r.json();
            const meta = j?.chart?.result?.[0]?.meta;
            if (!meta?.regularMarketPrice) return null;
            return { ...INDICES[idx], current: meta.regularMarketPrice, prev: meta.chartPreviousClose ?? meta.regularMarketPrice };
          } catch { return null; }
        }));
        if (mounted) {
          const map = {};
          results.forEach(r => { if (r) map[r.sym] = r; });
          setIndices(map);
        }
      } catch {} finally { if (mounted) setLoading(false); }
    };
    fetchIndices();
    const interval = setInterval(fetchIndices, 5 * 60 * 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const holdingRows = useMemo(() => rows.filter(r => r.curValue != null), [rows]);
  const totalValue = holdingRows.reduce((s, r) => s + (r.curValue || 0), 0) || 1;

  const heatmapData = useMemo(() => {
    let arr = holdingRows.map(r => ({
      symbol: r.symbol,
      name: r.name,
      value: r.curValue || 0,
      gain: r.gain || 0,
      gainPct: r.gainPct || 0,
      weight: ((r.curValue || 0) / totalValue) * 100,
    }));
    if (heatmapSort === 'value') arr.sort((a, b) => b.value - a.value);
    else if (heatmapSort === 'gain') arr.sort((a, b) => b.gainPct - a.gainPct);
    else if (heatmapSort === 'name') arr.sort((a, b) => a.symbol.localeCompare(b.symbol));
    return arr;
  }, [holdingRows, totalValue, heatmapSort]);

  const riskMetrics = useMemo(() => {
    const vals = holdingRows.map(r => (r.gainPct || 0));
    if (vals.length < 2) return { stocks: vals.length, best: null, worst: null, avgGain: null, positive: 0, negative: 0 };
    const avg = vals.reduce((a, v) => a + v, 0) / vals.length;
    const variance = vals.reduce((a, v) => a + (v - avg) ** 2, 0) / vals.length;
    return {
      stocks: vals.length,
      best: Math.max(...vals),
      worst: Math.min(...vals),
      avgGain: avg,
      volatility: Math.sqrt(variance),
      positive: vals.filter(v => v > 0).length,
      negative: vals.filter(v => v < 0).length,
    };
  }, [holdingRows]);

  const { v: netWorthV, fx: netWorthFx } = useMemo(() => {
    const inrVal = holdingRows.filter(r => r.currency === 'INR').reduce((s, r) => s + (r.curValue || 0), 0);
    const usdVal = holdingRows.filter(r => r.currency === 'USD').reduce((s, r) => s + (r.curValue || 0), 0);
    return { v: Math.round(inrVal + usdVal * (usdInr || 83.5)), fx: usdInr || 83.5 };
  }, [holdingRows, usdInr]);

  return (
    <div className="grow scroll-y">
      {offline && (
        <div style={{background:T.warnBg,color:T.warning,borderBottom:`1px solid ${T.warning}40`,padding:'8px 20px',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
          <span>⚠</span> You are offline. Prices may be stale.
          <button onClick={() => window.location.reload()} style={{marginLeft:'auto',background:T.warning,border:'none',borderRadius:4,color:'#000',padding:'3px 10px',fontSize:11,fontWeight:700,cursor:'pointer'}}>Retry</button>
        </div>
      )}
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:20}}>
        <div className="flex-between" style={{flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Market Dashboard</div>
            <div style={{fontSize:13,color:T.text3}}>Indices · Risk · Portfolio Health</div>
          </div>
          {onClose&&<NvBtn onClick={onClose} T={T}><Ic.X/> Close</NvBtn>}
        </div>

        {/* Network Status */}
        {!offline && <div style={{fontSize:11,color:T.success,display:'flex',alignItems:'center',gap:6}}><span style={{width:6,height:6,borderRadius:3,background:T.success,display:'inline-block'}}/> Online · Auto-refreshing indices every 5 min</div>}

        {/* Market Indices */}
        <div>
          <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:12}}>📊 Market Indices</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10}}>
            {INDICES.map(idx => (
              <IndexCard key={idx.sym} data={indices[idx.sym]} T={T} />
            ))}
          </div>
        </div>

        {/* Risk Metrics */}
        <div>
          <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:12}}>📈 Portfolio Risk</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
            {[
              {l:'Holdings', v:`${riskMetrics.stocks} stocks`},
              {l:'Avg Return', v:riskMetrics.avgGain!=null?fmtPct(riskMetrics.avgGain):'—', c:gColor(riskMetrics.avgGain,T)},
              {l:'Volatility (σ)', v:riskMetrics.volatility!=null?riskMetrics.volatility.toFixed(2):'—'},
              {l:'Best Performer', v:riskMetrics.best!=null?fmtPct(riskMetrics.best):'—', c:T.success},
              {l:'Worst Performer', v:riskMetrics.worst!=null?fmtPct(riskMetrics.worst):'—', c:T.danger},
              {l:'Winners / Losers', v:`${riskMetrics.positive} / ${riskMetrics.negative}`},
              {l:'Net Worth (INR)', v:`₹${netWorthV.toLocaleString('en-IN')}`},
              {l:'USD/INR', v:usdInr?`₹${usdInr.toFixed(2)}`:'—'},
            ].map((r,i)=>(
              <div key={i} style={{background:T.surface2,borderRadius:T.radiusSm,border:`1px solid ${T.border}`,padding:'10px 14px'}}>
                <div style={{fontSize:10,color:T.text3,fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:4}}>{r.l}</div>
                <div style={{fontSize:16,fontWeight:700,color:r.c||T.text}}>{r.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio Heatmap */}
        <div>
          <div className="flex-between" style={{marginBottom:12}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text}}>🗺️ Portfolio Heatmap</div>
            <div style={{display:'flex',gap:6}}>
              {['value','gain','name'].map(s=>(
                <button key={s} onClick={()=>setHeatmapSort(s)} style={{padding:'3px 10px',borderRadius:5,fontSize:11,fontWeight:600,border:`1px solid ${heatmapSort===s?T.accent:T.border2}`,background:heatmapSort===s?T.accentBg:'transparent',color:heatmapSort===s?T.accent:T.text3,cursor:'pointer'}}>{s==='value'?'By Value':s==='gain'?'By Return':'By Name'}</button>
              ))}
            </div>
          </div>
          <div ref={heatmapRef} style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:3}}>
            {heatmapData.map(h => {
              const intensity = Math.min(Math.abs(h.gainPct) / 30, 1);
              const bg = h.gainPct >= 0
                ? `rgba(118,185,0,${0.1 + intensity * 0.6})`
                : `rgba(244,67,54,${0.1 + intensity * 0.6})`;
              return (
                <div key={h.symbol} style={{background:bg,borderRadius:4,padding:'8px 6px',textAlign:'center',border:`1px solid ${h.gainPct>=0?T.success+'30':T.danger+'30'}`,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.05)';e.currentTarget.style.zIndex=2;}} onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.zIndex=1;}}>
                  <div style={{fontSize:10,fontWeight:700,color:T.text,marginBottom:2}}>{short(h.symbol)}</div>
                  <div style={{fontSize:9,color:T.text3}}>{h.weight.toFixed(1)}%</div>
                  <div style={{fontSize:11,fontWeight:700,color:h.gainPct>=0?T.success:T.danger}}>{h.gainPct>=0?'+':''}{h.gainPct?.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
