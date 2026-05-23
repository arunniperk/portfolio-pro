import React, { useState, useMemo, useEffect } from 'react';
import { NvBtn, NvInput } from '../components/ui';
import { fmt, short, fmtPct, gColor, isUS } from '../utils';
import { getItemSync, setItemSync } from '../storage';
import { Ic } from '../icons';

const REMINDERS_KEY = 'pm_reminders';

export default function TaxOptimizer({ T, rows, onClose }) {
  const [reminders, setReminders] = useState(() => {
    try { return JSON.parse(getItemSync(REMINDERS_KEY) || '[]'); } catch { return []; }
  });
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [remForm, setRemForm] = useState({ title:'', date:'', note:'', reccuring:false });

  useEffect(() => { setItemSync(REMINDERS_KEY, JSON.stringify(reminders)); }, [reminders]);

  const harvestCandidates = useMemo(() => {
    const now = Date.now();
    return rows.filter(r => {
      if (!r.curValue || !r.invested) return false;
      const loss = r.gain < 0;
      const daysHeld = r.addedAt ? Math.floor((now - r.addedAt) / (86400000)) : 90;
      return loss && daysHeld > 30;
    }).sort((a, b) => (a.gain || 0) - (b.gain || 0));
  }, [rows]);

  const taxSummary = useMemo(() => {
    const stcgPeriod = 365;
    let stcgLoss = 0, stcgGain = 0, ltcgLoss = 0, ltcgGain = 0;
    const now = Date.now();
    rows.forEach(r => {
      if (r.gain == null) return;
      const heldFor = r.addedAt ? (now - r.addedAt) / 86400000 : 365;
      if (heldFor < stcgPeriod) {
        if (r.gain < 0) stcgLoss += Math.abs(r.gain);
        else stcgGain += r.gain;
      } else {
        if (r.gain < 0) ltcgLoss += Math.abs(r.gain);
        else ltcgGain += r.gain;
      }
    });
    return { stcgLoss, stcgGain, ltcgLoss, ltcgGain, netSTCG: stcgGain - stcgLoss, netLTCG: ltcgGain - ltcgLoss };
  }, [rows]);

  const addReminder = () => {
    if (!remForm.title||!remForm.date) return;
    setReminders(p => [{ id: Date.now(), ...remForm, createdAt: Date.now() }, ...p]);
    setRemForm({ title:'', date:'', note:'', reccuring:false });
    setShowReminderForm(false);
  };
  const delReminder = id => { if (window.confirm('Delete this reminder?')) setReminders(p => p.filter(r => r.id !== id)); };

  const upcomingReminders = useMemo(() => {
    const now = new Date();
    now.setHours(0,0,0,0);
    return reminders.filter(r => new Date(r.date) >= now).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 20);
  }, [reminders]);

  const tdS = { padding:'8px 14px', fontSize:12, borderBottom:`1px solid ${T.border}` };

  return (
    <div className="grow scroll-y">
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
        <div className="flex-between" style={{flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Tax & Reminders</div>
            <div style={{fontSize:13,color:T.text3}}>Tax-loss harvesting · STCG/LTCG · Portfolio reminders</div>
          </div>
          {onClose&&<NvBtn onClick={onClose} T={T}><Ic.X/> Close</NvBtn>}
        </div>

        {/* Tax Summary */}
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:16}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>💰 Tax Summary</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
            {[
              {l:'STCG (Gain)', v:fmt(taxSummary.stcgGain,'INR'), c:taxSummary.stcgGain>0?T.success:T.text2},
              {l:'STCG (Loss)', v:fmt(taxSummary.stcgLoss,'INR'), c:taxSummary.stcgLoss>0?T.danger:T.text2},
              {l:'Net STCG', v:fmt(taxSummary.netSTCG,'INR'), c:gColor(taxSummary.netSTCG,T)},
              {l:'LTCG (Gain)', v:fmt(taxSummary.ltcgGain,'INR'), c:taxSummary.ltcgGain>0?T.success:T.text2},
              {l:'LTCG (Loss)', v:fmt(taxSummary.ltcgLoss,'INR'), c:taxSummary.ltcgLoss>0?T.danger:T.text2},
              {l:'Net LTCG', v:fmt(taxSummary.netLTCG,'INR'), c:gColor(taxSummary.netLTCG,T)},
            ].map((r,i)=>(
              <div key={i} style={{padding:'8px 12px',background:T.surface3,borderRadius:6}}>
                <div style={{fontSize:10,color:T.text3,fontWeight:600}}>{r.l}</div>
                <div style={{fontSize:14,fontWeight:700,color:r.c||T.text}}>{r.v}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:12,fontSize:11,color:T.text3,padding:'8px 12px',background:T.surface3,borderRadius:6,lineHeight:1.6}}>
            <b>Tax Notes:</b> Indian STCG (held &lt;12mo) taxed at 15%. LTCG (held ≥12mo) over ₹1L taxed at 10%. 
            US holdings: STCG at income slab, LTCG at 20%. Consider harvesting losses to offset gains.
          </div>
        </div>

        {/* Tax-Loss Harvesting Candidates */}
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.danger}40`,overflow:'hidden'}}>
          <div className="card-header" style={{borderColor:T.border}}>
            <div style={{width:3,height:16,background:T.danger,borderRadius:2}}/>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>Tax-Loss Harvesting Candidates</span>
            <span style={{marginLeft:'auto',fontSize:11,color:T.danger,fontWeight:600}}>{harvestCandidates.length} found</span>
          </div>
          {harvestCandidates.length === 0 ? (
            <div style={{padding:24,textAlign:'center',color:T.text3}}>No loss positions older than 30 days found.</div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:T.surface3}}>
                <th style={{padding:'8px 14px',textAlign:'left',color:T.text3,fontWeight:700,fontSize:11}}>Stock</th>
                <th style={{padding:'8px 14px',textAlign:'right',color:T.text3,fontWeight:700,fontSize:11}}>Loss</th>
                <th style={{padding:'8px 14px',textAlign:'right',color:T.text3,fontWeight:700,fontSize:11}}>Loss %</th>
                <th style={{padding:'8px 14px',textAlign:'right',color:T.text3,fontWeight:700,fontSize:11}}>Invested</th>
                <th style={{padding:'8px 14px',textAlign:'right',color:T.text3,fontWeight:700,fontSize:11}}>Current</th>
              </tr></thead>
              <tbody>
                {harvestCandidates.map((r,i) => (
                  <tr key={r.symbol} style={{background:i%2===0?T.surface2:T.surface3}}>
                    <td style={{...tdS,fontWeight:700,color:T.text}}>{short(r.symbol)}</td>
                    <td style={{...tdS,textAlign:'right',color:T.danger,fontWeight:700}}>{fmt(Math.abs(r.gain),r.currency)}</td>
                    <td style={{...tdS,textAlign:'right',color:T.danger}}>{fmtPct(r.gainPct)}</td>
                    <td style={{...tdS,textAlign:'right',color:T.text2}}>{fmt(r.invested,r.currency)}</td>
                    <td style={{...tdS,textAlign:'right',color:T.text}}>{fmt(r.curValue,r.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Reminders */}
        <div className="flex-between">
          <div style={{fontSize:14,fontWeight:700,color:T.text}}>📅 Portfolio Reminders</div>
          <NvBtn onClick={()=>setShowReminderForm(true)} variant="primary" T={T}><Ic.Plus/> Add Reminder</NvBtn>
        </div>

        {showReminderForm && (
          <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:16,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
            <NvInput value={remForm.title} onChange={e=>setRemForm(p=>({...p,title:e.target.value}))} placeholder="Title (e.g. SIP Due)" T={T}/>
            <NvInput value={remForm.date} onChange={e=>setRemForm(p=>({...p,date:e.target.value}))} placeholder="Date (YYYY-MM-DD)" T={T}/>
            <NvInput value={remForm.note} onChange={e=>setRemForm(p=>({...p,note:e.target.value}))} placeholder="Optional note" T={T}/>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12,color:T.text2}}>
                <input type="checkbox" checked={remForm.reccuring} onChange={e=>setRemForm(p=>({...p,reccuring:e.target.checked}))} style={{accentColor:T.accent}}/>
                Recurring
              </label>
              <NvBtn onClick={addReminder} variant="primary" disabled={!remForm.title||!remForm.date} T={T}>Save</NvBtn>
              <NvBtn onClick={()=>setShowReminderForm(false)} T={T}>Cancel</NvBtn>
            </div>
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {upcomingReminders.map(r => (
            <div key={r.id} className="flex-between animate-fadeIn" style={{padding:'10px 14px',background:T.surface2,borderRadius:8,border:`1px solid ${new Date(r.date) <= new Date(Date.now()+7*86400000) ? T.warning+'40' : T.border}`}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:10,color:T.text3,background:T.surface4,padding:'2px 6px',borderRadius:4,fontWeight:600}}>{new Date(r.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:T.text}}>{r.title}</div>
                  {r.note&&<div style={{fontSize:11,color:T.text3}}>{r.note}</div>}
                </div>
                {r.reccuring&&<span style={{fontSize:10,color:T.cyan,background:T.cyan+'15',padding:'1px 6px',borderRadius:4,fontWeight:600}}>↻</span>}
              </div>
              <button onClick={()=>delReminder(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:4}}><Ic.Trash/></button>
            </div>
          ))}
          {reminders.length === 0 && !showReminderForm && (
            <div className="flex-center" style={{padding:40,color:T.text3}}>No reminders. Add SIP dates, PPF maturity, FD renewals, etc.</div>
          )}
        </div>
      </div>
    </div>
  );
}
