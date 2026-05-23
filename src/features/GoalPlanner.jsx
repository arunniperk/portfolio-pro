import React, { useState, useMemo, useEffect } from 'react';
import { NvBtn, NvInput } from '../components/ui';
import { fmt, short } from '../utils';
import { getItemSync, setItemSync } from '../storage';
import { Ic } from '../icons';

const GOALS_KEY = 'pm_goals';

export default function GoalPlanner({ T, onClose }) {
  const [goals, setGoals] = useState(() => {
    try { return JSON.parse(getItemSync(GOALS_KEY) || '[]'); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', targetAmount:'', currentAmount:'', targetDate:'', monthlyContribution:'' });
  const [sipForm, setSipForm] = useState({ investment:'', monthly:'', expectedReturn:12, years:10 });
  const [sipResult, setSipResult] = useState(null);

  useEffect(() => { setItemSync(GOALS_KEY, JSON.stringify(goals)); }, [goals]);

  const addGoal = () => {
    if (!form.name||!form.targetAmount) return;
    setGoals(p => [{ id: Date.now(), ...form, targetAmount: parseFloat(form.targetAmount), currentAmount: parseFloat(form.currentAmount || 0), monthlyContribution: parseFloat(form.monthlyContribution || 0), createdAt: Date.now() }, ...p]);
    setForm({ name:'', targetAmount:'', currentAmount:'', targetDate:'', monthlyContribution:'' });
    setShowForm(false);
  };
  const delGoal = id => { if (window.confirm('Remove this goal?')) setGoals(p => p.filter(g => g.id !== id)); };
  const updateProgress = (id, amt) => setGoals(p => p.map(g => g.id === id ? { ...g, currentAmount: amt } : g));

  const calculateSIP = () => {
    const P = parseFloat(sipForm.monthly) || 0;
    const r = (parseFloat(sipForm.expectedReturn) || 12) / 12 / 100;
    const n = (parseFloat(sipForm.years) || 10) * 12;
    const fv = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    const invested = P * n;
    setSipResult({ invested, fv: Math.round(fv), gains: Math.round(fv - invested) });
  };

  useEffect(() => { if (sipForm.monthly) calculateSIP(); }, []);

  return (
    <div className="grow scroll-y">
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
        <div className="flex-between" style={{flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Goals & SIP Calculator</div>
            <div style={{fontSize:13,color:T.text3}}>{goals.length} goals tracked</div>
          </div>
          {onClose&&<NvBtn onClick={onClose} T={T}><Ic.X/> Close</NvBtn>}
        </div>

        {/* SIP Calculator */}
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:16}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>📊 SIP / DCA Calculator</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:10,marginBottom:12}}>
            <NvInput value={sipForm.monthly} onChange={e=>setSipForm(p=>({...p,monthly:e.target.value}))} placeholder="Monthly ₹" T={T}/>
            <NvInput value={sipForm.expectedReturn} onChange={e=>setSipForm(p=>({...p,expectedReturn:e.target.value}))} placeholder="Exp. Return %" T={T}/>
            <NvInput value={sipForm.years} onChange={e=>setSipForm(p=>({...p,years:e.target.value}))} placeholder="Years" T={T}/>
            <div style={{display:'flex',alignItems:'flex-end'}}><NvBtn onClick={calculateSIP} variant="primary" T={T}>Calculate</NvBtn></div>
          </div>
          {sipResult && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
              <div style={{padding:'10px 14px',background:T.surface3,borderRadius:6,textAlign:'center'}}>
                <div style={{fontSize:10,color:T.text3}}>Invested</div>
                <div style={{fontSize:16,fontWeight:700,color:T.text}}>₹{sipResult.invested.toLocaleString('en-IN')}</div>
              </div>
              <div style={{padding:'10px 14px',background:T.surface3,borderRadius:6,textAlign:'center'}}>
                <div style={{fontSize:10,color:T.text3}}>Future Value</div>
                <div style={{fontSize:16,fontWeight:700,color:T.accent}}>₹{sipResult.fv.toLocaleString('en-IN')}</div>
              </div>
              <div style={{padding:'10px 14px',background:T.surface3,borderRadius:6,textAlign:'center'}}>
                <div style={{fontSize:10,color:T.text3}}>Total Gain</div>
                <div style={{fontSize:16,fontWeight:700,color:T.success}}>₹{sipResult.gains.toLocaleString('en-IN')}</div>
              </div>
            </div>
          )}
        </div>

        {/* Goals */}
        <div className="flex-between">
          <div style={{fontSize:14,fontWeight:700,color:T.text}}>🎯 Financial Goals</div>
          <NvBtn onClick={()=>setShowForm(true)} variant="primary" T={T}><Ic.Plus/> Add Goal</NvBtn>
        </div>

        {showForm && (
          <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:16,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
            <NvInput value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Goal name" T={T}/>
            <NvInput value={form.targetAmount} onChange={e=>setForm(p=>({...p,targetAmount:e.target.value}))} placeholder="Target ₹" T={T}/>
            <NvInput value={form.currentAmount} onChange={e=>setForm(p=>({...p,currentAmount:e.target.value}))} placeholder="Current ₹" T={T}/>
            <NvInput value={form.targetDate} onChange={e=>setForm(p=>({...p,targetDate:e.target.value}))} placeholder="Target date" T={T}/>
            <NvInput value={form.monthlyContribution} onChange={e=>setForm(p=>({...p,monthlyContribution:e.target.value}))} placeholder="Monthly ₹" T={T}/>
            <div style={{display:'flex',alignItems:'flex-end',gap:6}}>
              <NvBtn onClick={addGoal} variant="primary" disabled={!form.name||!form.targetAmount} T={T}>Save</NvBtn>
              <NvBtn onClick={()=>setShowForm(false)} T={T}>Cancel</NvBtn>
            </div>
          </div>
        )}

        {goals.map(g => {
          const pct = g.targetAmount ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
          const remaining = g.targetAmount - g.currentAmount;
          const monthsToGoal = g.monthlyContribution > 0 ? Math.ceil(remaining / g.monthlyContribution) : null;
          return (
            <div key={g.id} style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:16}}>
              <div className="flex-between" style={{marginBottom:8}}>
                <div>
                  <span style={{fontWeight:700,fontSize:14,color:T.text}}>{g.name}</span>
                  {g.targetDate&&<span style={{fontSize:11,color:T.text3,marginLeft:8}}>by {new Date(g.targetDate).toLocaleDateString('en-IN')}</span>}
                </div>
                <button onClick={()=>delGoal(g.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:4,transition:'color .1s'}} onMouseEnter={e=>e.currentTarget.style.color=T.danger} onMouseLeave={e=>e.currentTarget.style.color=T.text3}><Ic.Trash/></button>
              </div>
              <div style={{height:8,background:T.surface4,borderRadius:4,overflow:'hidden',marginBottom:8}}>
                <div style={{width:`${pct}%`,height:'100%',background:pct>=100?T.success:T.accent,borderRadius:4,transition:'width .5s ease'}}/>
              </div>
              <div className="flex-between" style={{fontSize:12}}>
                <div><span style={{color:T.text2}}>₹{g.currentAmount.toLocaleString('en-IN')}</span><span style={{color:T.text3}}> / ₹{g.targetAmount.toLocaleString('en-IN')}</span></div>
                <span style={{fontWeight:700,color:pct>=100?T.success:T.accent}}>{pct.toFixed(0)}%</span>
              </div>
              <div className="flex-between" style={{marginTop:6,fontSize:11}}>
                <span style={{color:T.text3}}>Remaining: ₹{remaining.toLocaleString('en-IN')}</span>
                {monthsToGoal !== null && <span style={{color:T.cyan}}>{monthsToGoal >= 12 ? `${(monthsToGoal/12).toFixed(1)} yrs` : `${monthsToGoal} mo`} left</span>}
              </div>
              <div style={{marginTop:8,display:'flex',gap:8}}>
                <NvBtn onClick={() => { const a = window.prompt('Update current amount (₹):', String(g.currentAmount)); if (a) updateProgress(g.id, parseFloat(a)); }} size="sm" T={T}>Update Progress</NvBtn>
              </div>
            </div>
          );
        })}

        {goals.length === 0 && !showForm && (
          <div className="flex-center" style={{padding:60,color:T.text3,flexDirection:'column',gap:12}}>
            <div style={{fontSize:32}}>🎯</div>
            <div style={{fontWeight:600}}>No goals yet</div>
            <div style={{fontSize:12}}>Add financial goals to track your progress.</div>
          </div>
        )}
      </div>
    </div>
  );
}
