import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { NvBtn, NvInput } from '../components/ui';
import { fmt, short, isUS, fmtPct } from '../utils';
import { getItemSync, setItemSync } from '../storage';
import { Ic } from '../icons';

const STORAGE_KEY = 'pm_dividends';

export default function DividendTracker({ T, holdings, prices, onClose }) {
  const [dividends, setDividends] = useState(() => {
    try { return JSON.parse(getItemSync(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ symbol:'', name:'', divPerShare:'', frequency:'yearly', exDate:'', payDate:'', currency:'INR' });
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState({ col:'payDate', dir:'desc' });

  useEffect(() => { setItemSync(STORAGE_KEY, JSON.stringify(dividends)); }, [dividends]);

  const addDividend = () => {
    if (!form.symbol || !form.divPerShare) return;
    setDividends(p => [{ id: Date.now(), ...form, divPerShare: parseFloat(form.divPerShare), createdAt: Date.now() }, ...p]);
    setForm({ symbol:'', name:'', divPerShare:'', frequency:'yearly', exDate:'', payDate:'', currency:'INR' });
    setShowAdd(false);
  };

  const removeDiv = id => { if (window.confirm('Remove this dividend record?')) setDividends(p => p.filter(d => d.id !== id)); };

  const byStock = useMemo(() => {
    const map = {};
    dividends.forEach(d => {
      if (!map[d.symbol]) map[d.symbol] = { symbol: d.symbol, name: d.name, entries: [], totalAnnual: 0, currency: d.currency };
      map[d.symbol].entries.push(d);
      const freq = d.frequency === 'monthly' ? 12 : d.frequency === 'quarterly' ? 4 : d.frequency === 'semi-annual' ? 2 : 1;
      map[d.symbol].totalAnnual += d.divPerShare * freq;
    });
    return Object.values(map).sort((a, b) => b.totalAnnual - a.totalAnnual);
  }, [dividends]);

  const projectedIncome = useMemo(() => {
    let total = 0;
    const details = byStock.map(s => {
      const holding = holdings.find(h => h.symbol === s.symbol);
      const qty = holding?.qty || 0;
      const income = s.totalAnnual * qty;
      total += income;
      return { ...s, qty, income, holding };
    });
    return { details, total };
  }, [byStock, holdings]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return dividends.filter(d => d.payDate && new Date(d.payDate).getTime() > now).sort((a, b) => new Date(a.payDate) - new Date(b.payDate)).slice(0, 10);
  }, [dividends]);

  return (
    <div className="grow scroll-y">
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
        <div className="flex-between" style={{flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Dividend Tracker</div>
            <div style={{fontSize:13,color:T.text3}}>{dividends.length} records · ₹{projectedIncome.total.toLocaleString('en-IN',{maximumFractionDigits:0})}/yr projected</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <NvBtn onClick={()=>setShowAdd(true)} variant="primary" T={T}><Ic.Plus/> Add Dividend</NvBtn>
            {onClose&&<NvBtn onClick={onClose} T={T}><Ic.X/></NvBtn>}
          </div>
        </div>

        {showAdd && (
          <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:16,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10}}>
            <div><div style={{fontSize:10,color:T.text3,marginBottom:4,fontWeight:600}}>Symbol</div>
              <select value={form.symbol} onChange={e=>{const h=holdings.find(x=>x.symbol===e.target.value);setForm(p=>({...p,symbol:e.target.value,name:h?.name||'',currency:isUS(e.target.value)?'USD':'INR'}));}} style={{padding:'7px 10px',background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:6,color:T.text,fontSize:11,width:'100%'}}>
                <option value="">Select stock…</option>
                {holdings.map(h=><option key={h.symbol} value={h.symbol}>{short(h.symbol)}</option>)}
              </select>
            </div>
            <NvInput value={form.divPerShare} onChange={e=>setForm(p=>({...p,divPerShare:e.target.value}))} placeholder="₹/share" T={T}/>
            <div><div style={{fontSize:10,color:T.text3,marginBottom:4,fontWeight:600}}>Frequency</div>
              <select value={form.frequency} onChange={e=>setForm(p=>({...p,frequency:e.target.value}))} style={{padding:'7px 10px',background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:6,color:T.text,fontSize:11,width:'100%'}}>
                <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="semi-annual">Semi-Annual</option><option value="yearly">Yearly</option>
              </select>
            </div>
            <NvInput value={form.exDate} onChange={e=>setForm(p=>({...p,exDate:e.target.value}))} placeholder="Ex-Date (YYYY-MM-DD)" T={T}/>
            <NvInput value={form.payDate} onChange={e=>setForm(p=>({...p,payDate:e.target.value}))} placeholder="Pay-Date (YYYY-MM-DD)" T={T}/>
            <div style={{display:'flex',alignItems:'flex-end',gap:6}}>
              <NvBtn onClick={addDividend} variant="primary" disabled={!form.symbol||!form.divPerShare} T={T}><Ic.Plus/> Add</NvBtn>
              <NvBtn onClick={()=>setShowAdd(false)} T={T}>Cancel</NvBtn>
            </div>
          </div>
        )}

        {projectedIncome.details.length > 0 && (
          <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden'}}>
            <div className="card-header" style={{borderColor:T.border}}>
              <div style={{width:3,height:16,background:T.accent,borderRadius:2}}/>
              <span style={{fontSize:13,fontWeight:700,color:T.text}}>Projected Annual Income</span>
              <span style={{fontSize:12,fontWeight:700,color:T.accent,marginLeft:'auto'}}>₹{projectedIncome.total.toLocaleString('en-IN',{maximumFractionDigits:0})}/yr</span>
            </div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:T.surface3}}>
                <th style={{padding:'8px 14px',textAlign:'left',color:T.text3,fontWeight:700,fontSize:11}}>Stock</th>
                <th style={{padding:'8px 14px',textAlign:'right',color:T.text3,fontWeight:700,fontSize:11}}>Yield</th>
                <th style={{padding:'8px 14px',textAlign:'right',color:T.text3,fontWeight:700,fontSize:11}}>Holding</th>
                <th style={{padding:'8px 14px',textAlign:'right',color:T.text3,fontWeight:700,fontSize:11}}>Annual/Share</th>
                <th style={{padding:'8px 14px',textAlign:'right',color:T.text3,fontWeight:700,fontSize:11}}>Total Income</th>
              </tr></thead>
              <tbody>
                {projectedIncome.details.map(s => (
                  <tr key={s.symbol} style={{background:dividends.filter(d=>d.symbol===s.symbol).length?T.surface2:T.surface3}}>
                    <td style={{padding:'8px 14px',fontWeight:700,color:T.text}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <span style={{width:6,height:6,borderRadius:3,background:T.accent}}/>
                        {short(s.symbol)}
                        <span style={{fontSize:10,color:T.text3,fontWeight:400}}>{s.name}</span>
                      </div>
                    </td>
                    <td style={{padding:'8px 14px',textAlign:'right',color:T.text2}}>{s.entries.length} rec.</td>
                    <td style={{padding:'8px 14px',textAlign:'right',color:T.text}}>{s.qty || '—'}</td>
                    <td style={{padding:'8px 14px',textAlign:'right',color:T.accent,fontWeight:600}}>{s.currency==='USD'?'$':'₹'}{s.totalAnnual.toFixed(2)}</td>
                    <td style={{padding:'8px 14px',textAlign:'right',fontWeight:700,color:T.text}}>{s.currency==='USD'?'$':'₹'}{s.income.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {upcoming.length > 0 && (
          <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:16}}>
            <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:10}}>📅 Upcoming Payouts</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {upcoming.map(d => (
                <div key={d.id} className="flex-between" style={{padding:'6px 12px',background:T.surface3,borderRadius:6}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontWeight:700,color:T.accent}}>{short(d.symbol)}</span>
                    <span style={{fontSize:11,color:T.text3}}>{d.divPerShare}/{d.frequency}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:11,color:T.text3}}>Pay: {d.payDate||'—'}</span>
                    <button onClick={()=>removeDiv(d.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:2}}><Ic.Trash/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {dividends.length === 0 && (
          <div className="flex-center" style={{padding:60,color:T.text3,flexDirection:'column',gap:12}}>
            <div style={{fontSize:32}}>💵</div>
            <div style={{fontWeight:600}}>No dividend records yet</div>
            <div style={{fontSize:12}}>Add dividend details for your holdings to see projected income.</div>
          </div>
        )}
      </div>
    </div>
  );
}
