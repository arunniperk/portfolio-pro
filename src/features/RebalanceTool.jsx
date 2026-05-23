import React, { useState, useMemo, useEffect } from 'react';
import { NvBtn, NvInput } from '../components/ui';
import { fmt, short, fmtPct, gColor, isUS } from '../utils';
import { getItemSync, setItemSync } from '../storage';
import { Ic } from '../icons';

export default function RebalanceTool({ T, rows, prices, usdInr, onClose }) {
  const [targets, setTargets] = useState(() => {
    try { return JSON.parse(getItemSync('pm_rebalance_targets') || '{}'); } catch { return {}; }
  });
  const [mode, setMode] = useState('stock');
  const [editSym, setEditSym] = useState(null);
  const [editVal, setEditVal] = useState('');

  useEffect(() => { setItemSync('pm_rebalance_targets', JSON.stringify(targets)); }, [targets]);

  const holdingRows = useMemo(() => rows.filter(r => r.curValue != null), [rows]);
  const totalValue = holdingRows.reduce((s, r) => s + (r.curValue || 0), 0) || 1;

  const grouped = useMemo(() => {
    if (mode === 'sector') {
      const map = {};
      holdingRows.forEach(r => {
        const sec = r.sector || 'Uncategorised';
        if (!map[sec]) map[sec] = { name: sec, holdings: [], totalValue: 0, totalInv: 0 };
        map[sec].holdings.push(r);
        map[sec].totalValue += r.curValue || 0;
        map[sec].totalInv += r.invested || 0;
      });
      return Object.values(map);
    }
    return holdingRows.map(r => ({ name: r.symbol, display: short(r.symbol), holdings: [r], totalValue: r.curValue || 0, totalInv: r.invested || 0, isUS: isUS(r.symbol) }));
  }, [holdingRows, mode]);

  const rebalPlan = useMemo(() => {
    return grouped.map(g => {
      const currentPct = (g.totalValue / totalValue) * 100;
      const key = mode === 'sector' ? g.name : g.holdings[0]?.symbol;
      const targetPct = targets[key] ?? currentPct;
      const targetVal = (targetPct / 100) * totalValue;
      const diff = targetVal - g.totalValue;
      return { ...g, key, currentPct, targetPct, targetVal, diff, needsBuy: diff > 0, needsSell: diff < 0 };
    }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [grouped, targets, totalValue, mode]);

  const totalTargetPct = Object.values(targets).reduce((s, v) => s + v, 0);

  return (
    <div className="grow scroll-y">
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
        <div className="flex-between" style={{flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Portfolio Rebalancing</div>
            <div style={{fontSize:13,color:T.text3}}>Set target allocation & get buy/sell recommendations</div>
          </div>
          {onClose&&<NvBtn onClick={onClose} T={T}><Ic.X/> Close</NvBtn>}
        </div>

        <div style={{display:'flex',gap:8}}>
          {['stock','sector'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{padding:'6px 16px',borderRadius:6,border:`1px solid ${mode===m?T.accent:T.border2}`,background:mode===m?T.accentBg:'transparent',color:mode===m?T.accent:T.text2,cursor:'pointer',fontSize:12,fontWeight:600}}>
              By {m==='stock'?'Stock':'Sector'}
            </button>
          ))}
          {totalTargetPct > 0 && (
            <span style={{fontSize:11,color:Math.abs(totalTargetPct - 100) < 1 ? T.success : T.warning,display:'flex',alignItems:'center',gap:4}}>
              {Math.abs(totalTargetPct - 100) < 1 ? '✓ Allocated' : `Target: ${totalTargetPct.toFixed(0)}% (needs ${(100-totalTargetPct).toFixed(0)}% more)`}
            </span>
          )}
        </div>

        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:T.surface3}}>
                <th style={{padding:'10px 14px',textAlign:'left',color:T.text3,fontWeight:700,fontSize:11}}>{mode==='sector'?'Sector':'Stock'}</th>
                <th style={{padding:'10px 14px',textAlign:'right',color:T.text3,fontWeight:700,fontSize:11}}>Current</th>
                <th style={{padding:'10px 14px',textAlign:'right',color:T.text3,fontWeight:700,fontSize:11}}>Target %</th>
                <th style={{padding:'10px 14px',textAlign:'right',color:T.text3,fontWeight:700,fontSize:11}}>Target ₹</th>
                <th style={{padding:'10px 14px',textAlign:'right',color:T.text3,fontWeight:700,fontSize:11}}>Diff ₹</th>
                <th style={{padding:'10px 14px',textAlign:'center',color:T.text3,fontWeight:700,fontSize:11}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rebalPlan.map((g,i) => (
                <tr key={g.key} style={{background:i%2===0?T.surface2:T.surface3}}>
                  <td style={{padding:'10px 14px',fontWeight:700,color:T.text}}>
                    <div className="flex-between">
                      <span>{mode==='sector'?g.name:g.display}</span>
                      {mode==='stock'&&<span style={{fontSize:10,color:T.text3,background:T.surface4,padding:'1px 6px',borderRadius:4}}>{g.holdings.length}</span>}
                    </div>
                  </td>
                  <td style={{padding:'10px 14px',textAlign:'right',color:T.text2}}>{g.currentPct.toFixed(1)}%</td>
                  <td style={{padding:'10px 14px',textAlign:'right'}}>
                    {editSym === g.key ? (
                      <div style={{display:'flex',gap:4,alignItems:'center',justifyContent:'flex-end'}}>
                        <input value={editVal} onChange={e=>setEditVal(e.target.value)} style={{width:60,padding:'3px 6px',background:T.surface4,border:`1px solid ${T.accent}`,borderRadius:4,color:T.text,fontSize:11,textAlign:'right'}} autoFocus onKeyDown={e=>{if(e.key==='Enter'){const v=parseFloat(editVal);if(!isNaN(v)&&v>=0&&v<=100){setTargets(p=>({...p,[g.key]:v}));}setEditSym(null);}if(e.key==='Escape')setEditSym(null);}}/>
                        <button onClick={()=>{const v=parseFloat(editVal);if(!isNaN(v)&&v>=0&&v<=100){setTargets(p=>({...p,[g.key]:v}));}setEditSym(null);}} style={{background:'none',border:'none',cursor:'pointer',color:T.accent,padding:2}}><Ic.Check/></button>
                      </div>
                    ) : (
                      <span onClick={()=>{setEditSym(g.key);setEditVal(String(g.targetPct));}} style={{cursor:'pointer',padding:'2px 6px',borderRadius:4,color:T.accent,fontWeight:700}} onMouseEnter={e=>e.currentTarget.style.background=T.accentBg} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{g.targetPct.toFixed(1)}% ✏️</span>
                    )}
                  </td>
                  <td style={{padding:'10px 14px',textAlign:'right',color:T.text}}>₹{g.targetVal.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                  <td style={{padding:'10px 14px',textAlign:'right',fontWeight:700,color:g.diff>=0?T.success:T.danger}}>
                    {g.diff>=0?'+':''}₹{Math.abs(g.diff).toLocaleString('en-IN',{maximumFractionDigits:0})}
                  </td>
                  <td style={{padding:'10px 14px',textAlign:'center'}}>
                    {Math.abs(g.diff) > 100 ? (
                      <span style={{padding:'3px 10px',borderRadius:12,fontSize:10,fontWeight:700,background:g.needsBuy?T.successBg:T.dangerBg,color:g.needsBuy?T.success:T.danger}}>
                        {g.needsBuy ? `BUY ₹${g.diff.toLocaleString('en-IN',{maximumFractionDigits:0})}` : `SELL ₹${Math.abs(g.diff).toLocaleString('en-IN',{maximumFractionDigits:0})}`}
                      </span>
                    ) : <span style={{color:T.text3,fontSize:10}}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:16}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:8}}>Summary</div>
          {(() => {
            const totalBuy = rebalPlan.filter(r=>r.needsBuy).reduce((s,r)=>s+r.diff,0);
            const totalSell = rebalPlan.filter(r=>r.needsSell).reduce((s,r)=>s+Math.abs(r.diff),0);
            return (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10}}>
                {[
                  {l:'Current Value', v:`₹${totalValue.toLocaleString('en-IN',{maximumFractionDigits:0})}`},
                  {l:'Total to Buy', v:`₹${totalBuy.toLocaleString('en-IN',{maximumFractionDigits:0})}`, c:T.success},
                  {l:'Total to Sell', v:`₹${totalSell.toLocaleString('en-IN',{maximumFractionDigits:0})}`, c:T.danger},
                  {l:'Items Needing Action', v:rebalPlan.filter(r=>Math.abs(r.diff)>100).length.toString()},
                ].map((r,i)=>(
                  <div key={i} style={{padding:'8px 12px',background:T.surface3,borderRadius:6}}>
                    <div style={{fontSize:10,color:T.text3,fontWeight:600,marginBottom:2}}>{r.l}</div>
                    <div style={{fontSize:16,fontWeight:700,color:r.c||T.text}}>{r.v}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
