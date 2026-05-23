import React, { useState, useMemo } from 'react';
import { NvBtn, NvInput } from '../components/ui';
import { short } from '../utils';
import { Ic } from '../icons';

export default function SplitAdjuster({ T, holdings, onSaveUpdates, onClose }) {
  const [splitForm, setSplitForm] = useState({ symbol:'', ratio:'' });
  const [bonusForm, setBonusForm] = useState({ symbol:'', ratio:'' });

  const applySplit = () => {
    if (!splitForm.symbol || !splitForm.ratio) return;
    const [oldS, newS] = splitForm.ratio.split(':').map(Number);
    if (!oldS || !newS) { alert('Enter ratio as X:Y (e.g. 10:1 means 10 old → 1 new)'); return; }
    const factor = newS / oldS;
    const h = holdings.find(x => x.symbol === splitForm.symbol);
    if (!h) { alert('Stock not found in current portfolio'); return; }
    if (!window.confirm(`Apply ${oldS}:${newS} split to ${short(splitForm.symbol)}?\nQty: ${h.qty} → ${(h.qty * factor).toFixed(2)}\nBuy Price: ${h.buyPrice} → ${(h.buyPrice / factor).toFixed(2)}`)) return;
    onSaveUpdates(h.id, { qty: parseFloat((h.qty * factor).toFixed(8)), buyPrice: parseFloat((h.buyPrice / factor).toFixed(2)) });
    setSplitForm({ symbol:'', ratio:'' });
  };

  const applyBonus = () => {
    if (!bonusForm.symbol || !bonusForm.ratio) return;
    const [existing, bonus] = bonusForm.ratio.split(':').map(Number);
    if (!existing || !bonus) { alert('Enter ratio as X:Y (e.g. 1:1 means 1 bonus per 1 held)'); return; }
    const h = holdings.find(x => x.symbol === bonusForm.symbol);
    if (!h) { alert('Stock not found in current portfolio'); return; }
    const bonusQty = Math.floor(h.qty / existing) * bonus;
    if (!window.confirm(`Apply ${existing}:${bonus} bonus to ${short(bonusForm.symbol)}?\nExisting: ${h.qty} → Bonus shares: ${bonusQty}\nBuy Price adjusted: ${h.buyPrice} → ${((h.qty * h.buyPrice) / (h.qty + bonusQty)).toFixed(2)}`)) return;
    onSaveUpdates(h.id, { qty: h.qty + bonusQty, buyPrice: parseFloat(((h.qty * h.buyPrice) / (h.qty + bonusQty)).toFixed(2)) });
    setBonusForm({ symbol:'', ratio:'' });
  };

  return (
    <div className="grow scroll-y">
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
        <div className="flex-between" style={{flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Corporate Actions</div>
            <div style={{fontSize:13,color:T.text3}}>Adjust cost basis for stock splits & bonus issues</div>
          </div>
          {onClose&&<NvBtn onClick={onClose} T={T}><Ic.X/> Close</NvBtn>}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:16}}>
          {/* Split Adjuster */}
          <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:16}}>
            <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:4}}>🔄 Stock Split</div>
            <div style={{fontSize:12,color:T.text3,marginBottom:14}}>Adjust qty & buy price when a stock splits. E.g. 10:1 means 10 old → 1 new.</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div>
                <div style={{fontSize:10,color:T.text3,fontWeight:600,marginBottom:4}}>Stock</div>
                <select value={splitForm.symbol} onChange={e=>setSplitForm(p=>({...p,symbol:e.target.value}))} style={{width:'100%',padding:'7px 10px',background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:6,color:T.text,fontSize:12}}>
                  <option value="">Select stock…</option>
                  {holdings.map(h => <option key={h.symbol} value={h.symbol}>{short(h.symbol)} — Qty: {h.qty} @ ₹{h.buyPrice}</option>)}
                </select>
              </div>
              <NvInput value={splitForm.ratio} onChange={e=>setSplitForm(p=>({...p,ratio:e.target.value}))} placeholder="Split ratio (e.g. 10:1)" T={T}/>
              <NvBtn onClick={applySplit} variant="primary" disabled={!splitForm.symbol||!splitForm.ratio} T={T}>Apply Split</NvBtn>
            </div>
          </div>

          {/* Bonus Adjuster */}
          <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:16}}>
            <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:4}}>🎁 Bonus Shares</div>
            <div style={{fontSize:12,color:T.text3,marginBottom:14}}>Adjust qty & buy price when bonus shares are issued. E.g. 1:1 means 1 bonus per 1 held.</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div>
                <div style={{fontSize:10,color:T.text3,fontWeight:600,marginBottom:4}}>Stock</div>
                <select value={bonusForm.symbol} onChange={e=>setBonusForm(p=>({...p,symbol:e.target.value}))} style={{width:'100%',padding:'7px 10px',background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:6,color:T.text,fontSize:12}}>
                  <option value="">Select stock…</option>
                  {holdings.map(h => <option key={h.symbol} value={h.symbol}>{short(h.symbol)} — Qty: {h.qty} @ ₹{h.buyPrice}</option>)}
                </select>
              </div>
              <NvInput value={bonusForm.ratio} onChange={e=>setBonusForm(p=>({...p,ratio:e.target.value}))} placeholder="Bonus ratio (e.g. 1:1)" T={T}/>
              <NvBtn onClick={applyBonus} variant="primary" disabled={!bonusForm.symbol||!bonusForm.ratio} T={T}>Apply Bonus</NvBtn>
            </div>
          </div>
        </div>

        <div style={{background:T.surface3,borderRadius:8,padding:16,fontSize:11,color:T.text3,lineHeight:1.7}}>
          <b style={{color:T.text}}>How it works:</b><br/>
          • <b>Split:</b> If a stock splits 10:1, your quantity divides by 10 and buy price multiplies by 10. Total investment stays the same.<br/>
          • <b>Bonus:</b> If 1:1 bonus, your quantity doubles and buy price halves. Total investment stays the same.<br/>
          • These adjustments keep your cost basis accurate for P&L calculation.
        </div>
      </div>
    </div>
  );
}
