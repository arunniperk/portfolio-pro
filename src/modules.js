import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { NvBtn, NvInput, Badge, SortTh } from './components/ui';
import { Ic } from './icons';
import { fmt, fmtQty, fmtPct, sortRows, gColor, isUS, short, xirr } from './utils';
import { useYahooSearch, useNotes } from './hooks';
import { getItemSync, setItemSync } from './storage';

export function NotesModule({T,holdings,onClose}) {
  const {notes,saveNote}=useNotes();
  const [editSym,setEditSym]=useState(null);
  const [editText,setEditText]=useState('');
  const [filter,setFilter]=useState('');

  const allSymbols=[...new Set([...Object.keys(notes),...(holdings||[]).map(h=>h.symbol)])].filter(s=>!filter||s.includes(filter.toUpperCase())||(notes[s]||'').toLowerCase().includes(filter.toLowerCase()));

  const INP={padding:'8px 12px',background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:6,color:T.text,fontSize:12,outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit'};

  return(
    <div style={{flex:1,overflowY:'auto',minHeight:0}}>
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Stock Notes</div>
          <div style={{fontSize:13,color:T.text3}}>{Object.keys(notes).length} note{Object.keys(notes).length!==1?'s':''}</div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div style={{position:'relative'}}><span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:T.text3,pointerEvents:'none'}}><Ic.Search/></span><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter stocks…" style={{...INP,width:180,paddingLeft:30}}/></div>
          {onClose&&<button onClick={onClose} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:6,cursor:'pointer',color:T.text3,padding:'7px 8px',display:'flex',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}><Ic.X/></button>}
        </div>
      </div>

      {!allSymbols.length&&<div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:40,textAlign:'center',color:T.text3}}>No notes yet. Click any stock detail tab to add notes.</div>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
        {allSymbols.map(sym=>{
          const holding=(holdings||[]).find(h=>h.symbol===sym);
          const note=notes[sym]||'';
          const isEdit=editSym===sym;
          return(
            <div key={sym} style={{background:T.surface2,borderRadius:8,border:`1px solid ${note?T.border:T.border}`,padding:16,display:'flex',flexDirection:'column',gap:10}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontWeight:700,color:T.accent,fontSize:13}}>{short(sym)}</div>
                  {holding&&<div style={{fontSize:11,color:T.text3}}>{holding.name}</div>}
                </div>
                <div style={{display:'flex',gap:6}}>
                  {!isEdit&&<button onClick={()=>{setEditSym(sym);setEditText(note);}} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:6,cursor:'pointer',color:T.text3,padding:'4px 8px',display:'flex',alignItems:'center',gap:4,fontSize:11,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}><Ic.Pencil/> Edit</button>}
                  {note&&!isEdit&&<button onClick={()=>{if(window.confirm(`Clear note for ${short(sym)}?`)) saveNote(sym,'');}} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:6,cursor:'pointer',color:T.text3,padding:'4px 8px',display:'flex',alignItems:'center',fontSize:11,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.danger;e.currentTarget.style.color=T.danger;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}><Ic.Trash/></button>}
                </div>
              </div>
              {isEdit?(
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <textarea value={editText} onChange={e=>setEditText(e.target.value)} rows={4} style={{...INP,resize:'vertical',lineHeight:1.6}} placeholder="Investment rationale, risks, targets…" autoFocus/>
                  <div style={{display:'flex',gap:8}}>
                    <NvBtn onClick={()=>{saveNote(sym,editText);setEditSym(null);}} variant="primary" T={T}><Ic.Check/> Save</NvBtn>
                    <NvBtn onClick={()=>setEditSym(null)} T={T}><Ic.X/> Cancel</NvBtn>
                  </div>
                </div>
              ):(
                <div style={{fontSize:12,color:note?T.text:T.text3,lineHeight:1.7,fontStyle:note?'normal':'italic',minHeight:40,whiteSpace:'pre-wrap'}}>{note||'No note. Click Edit to add.'}</div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: PRICE ALERTS ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// Storage: pm_alerts = [{id,symbol,name,direction,price,currency,triggered,triggeredAt}]
// Alerts are checked whenever prices refresh

export function AlertsModule({T,prices,holdings,alerts,setAlerts,onClose}) {
  const [market,setMarket]=useState('IN');
  const [form,setForm]=useState({symbol:'',name:'',t1:'',t2:'',currency:'INR'});
  const [showAdd,setShowAdd]=useState(false);
  const [editingId,setEditingId]=useState(null);
  const [editForm,setEditForm]=useState({t1:'',t2:''});
  const [sort,setSort]=useState({col:'symbol',dir:'asc'});

  const handleSort=(col)=>setSort(p=>({col,dir:p.col===col&&p.dir==='asc'?'desc':'asc'}));

  const active=alerts.filter(a=>{
    const isUsAlert = isUS(a.symbol);
    return (market==='US' ? isUsAlert : !isUsAlert) && (!a.t1Hit || (a.t2!=null && !a.t2Hit));
  });
  const triggered=alerts.filter(a=>{
    const isUsAlert = isUS(a.symbol);
    return (market==='US' ? isUsAlert : !isUsAlert) && (a.t1Hit && (a.t2==null || a.t2Hit));
  });

  const activeRows=useMemo(()=>{
    const filtered=holdings.filter(h=>{
      const isUsH=isUS(h.symbol);
      return (market==='US'?isUsH:!isUsH) && alerts.some(a=>a.symbol===h.symbol && !triggered.some(t=>t.id===a.id));
    }).map(h=>{
      const cp=prices[h.symbol]?.current;
      const prev=prices[h.symbol]?.prev;
      return {...h, curPrice:cp, dayPct:cp&&prev?((cp-prev)/prev*100):null};
    });
    return sortRows(filtered,sort.col,sort.dir);
  },[holdings,alerts,triggered,market,prices,sort]);

  // Check alerts against current prices
  useEffect(()=>{
    if(!prices||!alerts.length)return;
    let changed=false;
    const updated=alerts.map(a=>{
      const p=prices[a.symbol]?.current;
      if(!p)return a;
      let nt1=a.t1Hit, nt1At=a.t1HitAt, nt2=a.t2Hit, nt2At=a.t2HitAt;

      // Check T1
      if(!nt1 && a.t1!=null){
        const hit=(a.direction==='above'&&p>=a.t1)||(a.direction==='below'&&p<=a.t1);
        if(hit){
          nt1=true; nt1At=Date.now(); changed=true;
          if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
            new Notification(`Target 1 Met: ${short(a.symbol)}`,{body:`${short(a.symbol)} reached ${a.currency==='USD'?'$':'₹'}${a.t1}`});
          }
        }
      }
      // Check T2
      if(!nt2 && a.t2!=null){
        const hit=(a.direction==='above'&&p>=a.t2)||(a.direction==='below'&&p<=a.t2);
        if(hit){
          nt2=true; nt2At=Date.now(); changed=true;
          if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
            new Notification(`Target 2 Met: ${short(a.symbol)}`,{body:`${short(a.symbol)} reached ${a.currency==='USD'?'$':'₹'}${a.t2}`});
          }
        }
      }

      if(nt1!==a.t1Hit || nt2!==a.t2Hit) return {...a, t1Hit:nt1, t1HitAt:nt1At, t2Hit:nt2, t2HitAt:nt2At};
      return a;
    });
    if(changed){setAlerts(updated);setItemSync('pm_alerts',JSON.stringify(updated));}
  },[prices, alerts]);

  // Request notification permission
  useEffect(()=>{
    if(typeof Notification!=='undefined'&&Notification.permission==='default'){
      Notification.requestPermission();
    }
  },[]);

  // doSearch: provided by useYahooSearch hook

  const addAlert=()=>{
    if(!form.symbol||!form.t1)return;
    const cp=prices[form.symbol]?.current;
    const dir=(cp && parseFloat(form.t1)<cp)?'below':'above';
    setAlerts(p=>[{
      id:Date.now(),
      symbol:form.symbol,
      name:form.name||form.symbol,
      direction:dir,
      t1:parseFloat(form.t1),
      t1Hit:false,
      t1HitAt:null,
      t2:form.t2?parseFloat(form.t2):null,
      t2Hit:false,
      t2HitAt:null,
      currency:form.currency,
      createdAt:Date.now()
    },...p]);
    setForm({symbol:'',name:'',t1:'',t2:'',currency:'INR'});setShowAdd(false);
  };
  const removeAlert=id=>{
    if(window.confirm("Remove this price alert?")){
      setAlerts(p=>p.filter(a=>a.id!==id));
    }
  };
  const removeAllForStock=sym=>{
    if(window.confirm(`Remove ALL alerts for ${short(sym)}?`)){
      setAlerts(p=>p.filter(a=>a.symbol!==sym));
    }
  };
  const resetAlert=id=>setAlerts(p=>p.map(a=>a.id===id?{...a,t1Hit:false,t1HitAt:null,t2Hit:false,t2HitAt:null}:a));
  const saveEdit=(id)=>{
    setAlerts(p=>p.map(a=>a.id===id?{...a,t1:parseFloat(editForm.t1),t2:editForm.t2?parseFloat(editForm.t2):null,t1Hit:false,t2Hit:false,t1HitAt:null,t2HitAt:null}:a));
    setEditingId(null);
  };



  const INP={padding:'8px 12px',background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:6,color:T.text,fontSize:12,outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit'};
  const tdS={padding:'10px 14px',borderBottom:`1px solid ${T.border}`,fontSize:12};

  return(
    <div style={{flex:1,overflowY:'auto',minHeight:0}}>
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Price Alerts</div>
          <div style={{fontSize:13,color:T.text3}}>{active.length} active · {triggered.length} triggered</div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <NvBtn onClick={()=>{setShowAdd(v=>!v); if(!showAdd) setForm(p=>({...p, currency:market==='US'?'USD':'INR'}));}} variant="primary" T={T}><Ic.Plus/> New Alert</NvBtn>
          {onClose&&<button onClick={onClose} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:6,cursor:'pointer',color:T.text3,padding:'7px 8px',display:'flex',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}><Ic.X/></button>}
        </div>
      </div>

      {/* Market Tabs */}
      <div style={{display:'flex',gap:8,borderBottom:`1px solid ${T.border}`,paddingBottom:0,marginBottom:8}}>
        {[{id:'IN',label:'Indian Stocks',icon:'🇮🇳'},{id:'US',label:'US Stocks',icon:'🇺🇸'}].map(m=>(
          <button key={m.id} onClick={()=>setMarket(m.id)} style={{
            background:'none',border:'none',padding:'10px 16px',cursor:'pointer',
            color:market===m.id?T.accent:T.text3,
            borderBottom:market===m.id?`2px solid ${T.accent}`:'2px solid transparent',
            fontSize:13,fontWeight:market===m.id?700:400,transition:'all .15s',
            display:'flex',alignItems:'center',gap:8,outline:'none'
          }}>
            <span>{m.icon}</span> {m.label}
            <span style={{fontSize:11,background:market===m.id?T.accentBg:T.surface3,color:market===m.id?T.accent:T.text3,padding:'1px 7px',borderRadius:10,fontWeight:600}}>
              {alerts.filter(a=>{
                const isUsA=isUS(a.symbol);
                return (m.id==='US'?isUsA:!isUsA) && (!a.t1Hit || (a.t2!=null && !a.t2Hit));
              }).length}
            </span>
          </button>
        ))}
      </div>

      {showAdd&&(
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:18}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:14}}>Create Price Alert</div>
          {/* Quick-add from portfolio */}
          {holdings?.length>0&&!form.symbol&&(
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:6,textTransform:'uppercase',letterSpacing:'.05em'}}>Quick pick from portfolio</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {holdings.filter(h=>{
                  const isUsH=isUS(h.symbol);
                  return (market==='US'?isUsH:!isUsH) && !alerts.some(a=>a.symbol===h.symbol&&!a.triggered);
                }).map(h=>(
                  <button key={h.symbol} onClick={()=>{setForm(p=>({...p,symbol:h.symbol,name:h.name,currency:isUS(h.symbol)?'USD':'INR'}));}} style={{padding:'4px 10px',borderRadius:6,border:`1px solid ${T.border2}`,background:T.surface3,color:T.text2,cursor:'pointer',fontSize:11,fontWeight:600,transition:'all .12s',display:'flex',alignItems:'center',gap:4}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border2;e.currentTarget.style.color=T.text2;}}>{short(h.symbol)}</button>
                ))}
              </div>
            </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1.5fr 0.8fr 0.8fr 0.6fr auto',gap:10,alignItems:'end'}}>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Stock</div>
              <select 
                value={form.symbol} 
                onChange={e=>{
                  const h=holdings.find(x=>x.symbol===e.target.value);
                  setForm(p=>({...p,symbol:e.target.value,name:h?.name||e.target.value,currency:isUS(e.target.value)?'USD':'INR'}));
                }} 
                style={INP}
              >
                <option value="">Select Portfolio Stock…</option>
                {holdings.filter(h=>market==='US'?isUS(h.symbol):!isUS(h.symbol)).map(h=><option key={h.symbol} value={h.symbol}>{short(h.symbol)} — {h.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Target 1</div>
              <input type="number" value={form.t1} onChange={e=>setForm(p=>({...p,t1:e.target.value}))} placeholder="T1" style={INP}/>
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Target 2</div>
              <input type="number" value={form.t2} onChange={e=>setForm(p=>({...p,t2:e.target.value}))} placeholder="Optional T2" style={INP}/>
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Mkt</div>
              <select value={form.currency} onChange={e=>setForm(p=>({...p,currency:e.target.value}))} style={{...INP}}>
                <option value="INR">🇮🇳 INR</option>
                <option value="USD">🇺🇸 USD</option>
              </select>
            </div>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <NvBtn onClick={addAlert} variant="primary" disabled={!form.symbol||!form.t1} T={T}><Ic.Plus/> Add</NvBtn>
              <NvBtn onClick={()=>{setShowAdd(false);}} T={T}><Ic.X/></NvBtn>
            </div>
          </div>
        </div>
      )}

      {/* Active Alerts List */}
      <div style={{background:T.surface2,borderRadius:8,border:'1px solid ' + T.border,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid ' + T.border,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:3,height:16,background:T.cyan,borderRadius:2}}/>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>Active Alerts</span>
            <span style={{fontSize:11,color:T.text3,background:T.surface3,padding:'2px 8px',borderRadius:10,fontWeight:600}}>{active.length}</span>
          </div>
        </div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:T.surface3}}>
              <SortTh label="Stock" col="symbol" sort={sort} onSort={handleSort} T={T}/>
              <SortTh label="LTP" col="curPrice" sort={sort} onSort={handleSort} T={T} right/>
              <SortTh label="Buy Price" col="buyPrice" sort={sort} onSort={handleSort} T={T} right/>
              <SortTh label="Day %" col="dayPct" sort={sort} onSort={handleSort} T={T} right/>
              <th style={{...tdS,color:T.text3,fontSize:10,fontWeight:700,textAlign:'right'}}>Alert Status</th>
              <th style={{...tdS,color:T.text3,fontSize:10,fontWeight:700,textAlign:'right'}}>Quick Set</th>
            </tr>
          </thead>
          <tbody>
            {activeRows.map((h,i)=>{
              const cp=h.curPrice;
              const dayPct=h.dayPct;
              const cur=isUS(h.symbol)?'USD':'INR';
              const sym=cur==='USD'?'$':'₹';
              const activeForStock=alerts.filter(a=>a.symbol===h.symbol && (!a.t1Hit || (a.t2!=null && !a.t2Hit)));
              return(
                <tr key={h.symbol} style={{background:i%2===0?T.surface2:T.surface3,transition:'background .08s'}} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface2:T.surface3}>
                  <td style={{...tdS,textAlign:'left'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <button onClick={()=>removeAllForStock(h.symbol)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:0,display:'flex',transition:'color .1s'}} onMouseEnter={e=>e.currentTarget.style.color=T.danger} onMouseLeave={e=>e.currentTarget.style.color=T.text3} title="Remove all alerts for this stock"><Ic.Trash/></button>
                      <div style={{width:24,height:24,borderRadius:6,background:isUS(h.symbol)?'rgba(0,180,216,.12)':'rgba(255,152,0,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:700,color:isUS(h.symbol)?T.usColor:T.inColor,flexShrink:0}}>{short(h.symbol).slice(0,2)}</div>
                      <div><div style={{fontWeight:700,color:T.text,fontSize:12}}>{short(h.symbol)}</div><div style={{fontSize:10,color:T.text3,maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.name}</div></div>
                    </div>
                  </td>
                  <td style={{...tdS,textAlign:'right',fontWeight:700,color:T.text}}>{cp?`${sym}${cp.toFixed(2)}`:'—'}</td>
                  <td style={{...tdS,textAlign:'right',color:T.text2}}>{sym}{h.buyPrice.toFixed(2)}</td>
                  <td style={{...tdS,textAlign:'right'}}>{dayPct!=null?<span style={{fontWeight:700,color:dayPct>=0?T.success:T.danger}}>{dayPct>=0?'+':''}{dayPct.toFixed(2)}%</span>:'—'}</td>
                  <td style={{...tdS,textAlign:'right'}}>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                      {activeForStock.length>0 ? activeForStock.map(a=>(
                        <div key={a.id} style={{display:'flex',alignItems:'center',gap:4}}>
                          <span style={{padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700,background:T.accentBg,color:T.accent}}>{a.direction==='above'?'▲':'▼'} {sym}{a.t1}{a.t2?` / ${a.t2}`:''}</span>
                          <button onClick={()=>removeAlert(a.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:0,display:'flex'}}><Ic.X/></button>
                        </div>
                      )) : <span style={{fontSize:10,color:T.text3}}>No alert</span>}
                    </div>
                  </td>
                  <td style={{...tdS,textAlign:'right'}}>
                    <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                      {cp&&<>
                        <button onClick={()=>{setAlerts(p=>[{id:Date.now(),symbol:h.symbol,name:h.name,direction:'above',t1:Math.round(cp*1.05*100)/100,t1Hit:false,t1HitAt:null,t2:Math.round(cp*1.10*100)/100,t2Hit:false,t2HitAt:null,currency:cur,createdAt:Date.now()},...p]);}} style={{padding:'3px 8px',borderRadius:5,border:`1px solid ${T.success}40`,background:T.successBg,color:T.success,cursor:'pointer',fontSize:10,fontWeight:700,transition:'all .1s'}} onMouseEnter={e=>e.currentTarget.style.background=T.success+'30'} onMouseLeave={e=>e.currentTarget.style.background=T.successBg} title={`Alert above ${sym}${(cp*1.05).toFixed(0)} (+5%)`}>▲ +5%</button>
                        <button onClick={()=>{setAlerts(p=>[{id:Date.now()+1,symbol:h.symbol,name:h.name,direction:'below',t1:Math.round(cp*0.95*100)/100,t1Hit:false,t1HitAt:null,t2:Math.round(cp*0.90*100)/100,t2Hit:false,t2HitAt:null,currency:cur,createdAt:Date.now()},...p]);}} style={{padding:'3px 8px',borderRadius:5,border:`1px solid ${T.danger}40`,background:T.dangerBg,color:T.danger,cursor:'pointer',fontSize:10,fontWeight:700,transition:'all .1s'}} onMouseEnter={e=>e.currentTarget.style.background=T.danger+'30'} onMouseLeave={e=>e.currentTarget.style.background=T.dangerBg} title={`Alert below ${sym}${(cp*0.95).toFixed(0)} (-5%)`}>▼ -5%</button>
                        <button onClick={()=>{setShowAdd(true);setForm({symbol:h.symbol,name:h.name,t1:'',t2:'',currency:cur});}} style={{padding:'3px 8px',borderRadius:5,border:`1px solid ${T.border2}`,background:'transparent',color:T.text3,cursor:'pointer',fontSize:10,fontWeight:600,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border2;e.currentTarget.style.color=T.text3;}}>Custom</button>
                      </>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Triggered Alerts List */}
      {triggered.length>0&&(
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.success}40`,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:3,height:16,background:T.success,borderRadius:2}}/>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>Triggered Alerts</span>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:T.surface3}}>{['Stock','Results','Completed At','Actions'].map(h=><th key={h} style={{...tdS,color:T.text3,fontSize:10,fontWeight:700}}>{h}</th>)}</tr></thead>
            <tbody>{triggered.map((a,i)=>{
              const sym=a.currency==='USD'?'$':'₹';
              const isEdit=editingId===a.id;
              return(
                <tr key={a.id} style={{background:i%2===0?T.surface2:T.surface3}}>
                  <td style={{...tdS}}><div style={{fontWeight:700,color:T.accent}}>{short(a.symbol)}</div></td>
                  <td style={{...tdS}}>
                    {isEdit ? (
                      <div style={{display:'flex',gap:6}}>
                        <input value={editForm.t1} onChange={e=>setEditForm(p=>({...p,t1:e.target.value}))} style={{...INP,width:80,padding:'4px 8px'}} placeholder="T1"/>
                        <input value={editForm.t2} onChange={e=>setEditForm(p=>({...p,t2:e.target.value}))} style={{...INP,width:80,padding:'4px 8px'}} placeholder="T2"/>
                      </div>
                    ) : (
                      <div style={{fontSize:11,color:T.text2}}>
                        T1: {sym}{a.t1} {a.t2?`· T2: ${sym}${a.t2}`:''}
                      </div>
                    )}
                  </td>
                  <td style={{...tdS,color:T.text3,fontSize:11}}>{new Date(a.t2HitAt||a.t1HitAt).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                  <td style={{...tdS}}>
                    {isEdit ? (
                      <div style={{display:'flex',gap:5}}>
                        <button onClick={()=>saveEdit(a.id)} style={{padding:'4px 10px',background:T.accent,color:'#000',border:'none',borderRadius:4,fontSize:11,fontWeight:700,cursor:'pointer'}}>Save</button>
                        <button onClick={()=>setEditingId(null)} style={{padding:'4px 10px',background:T.surface4,color:T.text2,border:'none',borderRadius:4,fontSize:11,cursor:'pointer'}}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>{setEditingId(a.id);setEditForm({t1:a.t1,t2:a.t2||''});}} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:4,color:T.text2,padding:'3px 8px',fontSize:11,cursor:'pointer'}}>Edit Targets</button>
                        <button onClick={()=>resetAlert(a.id)} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:4,color:T.text3,padding:'3px 8px',fontSize:11,cursor:'pointer'}}>Reset</button>
                        <button onClick={()=>removeAlert(a.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:'3px 6px',borderRadius:4}}><Ic.Trash/></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: SECTOR ALLOCATION ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// Fetches sector from Yahoo Finance v10 quoteSummary assetProfile
// Storage: pm_sectors = { SYMBOL: { sector, industry } }

export function SectorModule({T,rows,prices,usdInr,onClose}) {
  const [sectorMap,setSectorMap]=useState(()=>{try{return JSON.parse(getItemSync('pm_sectors')||'{}');}catch{return {};}});
  const [loading,setLoading]=useState(false);
  const [manualEdit,setManualEdit]=useState(null);
  const [editVal,setEditVal]=useState('');

  useEffect(()=>{setItemSync('pm_sectors',JSON.stringify(sectorMap));},[sectorMap]);

  const fetchSectors=async()=>{
    setLoading(true);
    const toFetch=rows.filter(r=>!sectorMap[r.symbol]);
    await Promise.all(toFetch.map(async r=>{
      try{
        const res=await fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(r.symbol)}?modules=assetProfile`,{headers:{Accept:'application/json'}});
        if(res.ok){const j=await res.json();const p=j?.quoteSummary?.result?.[0]?.assetProfile;if(p?.sector){setSectorMap(prev=>({...prev,[r.symbol]:{sector:p.sector,industry:p.industry||p.sector}}));}}
      }catch{}
    }));
    setLoading(false);
  };

  // Group rows by sector — all values in INR (USD converted via usdInr)
  const toINR=(val,cur)=>cur==='USD'?(usdInr?val*usdInr:val*83.5):val;
  const grouped=useMemo(()=>{
    const map={};
    rows.forEach(r=>{
      const sec=sectorMap[r.symbol]?.sector||'Uncategorised';
      if(!map[sec])map[sec]={sector:sec,holdings:[],totalValue:0,totalInvested:0,totalGain:0};
      const cur=r.currency||'INR';
      const val=toINR(r.curValue??r.invested,cur);
      map[sec].holdings.push(r);
      map[sec].totalValue+=val;
      map[sec].totalInvested+=toINR(r.invested,cur);
      map[sec].totalGain+=toINR(r.gain??0,cur);
    });
    return Object.values(map).sort((a,b)=>b.totalValue-a.totalValue);
  },[rows,sectorMap,usdInr]);

  const totalValue=rows.reduce((s,r)=>s+toINR(r.curValue??r.invested,r.currency||'INR'),0)||1;

  const SEC_COLORS=['#6366f1','#76b900','#00b4d8','#f59e0b','#ef4444','#a855f7','#06b6d4','#f97316','#10b981','#ec4899'];

  const CX=110,CY=110,OUTER=100,INNER=50;
  const segs=useMemo(()=>{
    let cum=0;
    return grouped.map((g,i)=>{
      const frac=g.totalValue/totalValue;
      const s=cum+0.005,e=cum+frac-0.005;cum+=frac;
      const sa=(s*2*Math.PI)-Math.PI/2,ea=(e*2*Math.PI)-Math.PI/2;
      const x1=CX+OUTER*Math.cos(sa),y1=CY+OUTER*Math.sin(sa),x2=CX+OUTER*Math.cos(ea),y2=CY+OUTER*Math.sin(ea);
      const xi=CX+INNER*Math.cos(ea),yi=CY+INNER*Math.sin(ea),xi2=CX+INNER*Math.cos(sa),yi2=CY+INNER*Math.sin(sa);
      return{...g,frac,color:SEC_COLORS[i%SEC_COLORS.length],path:`M${x1} ${y1} A${OUTER} ${OUTER} 0 ${frac>.5?1:0} 1 ${x2} ${y2} L${xi} ${yi} A${INNER} ${INNER} 0 ${frac>.5?1:0} 0 ${xi2} ${yi2}Z`};
    });
  },[grouped,totalValue]);

  const [hover,setHover]=useState(null);
  const INP={padding:'7px 10px',background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:6,color:T.text,fontSize:12,outline:'none',fontFamily:'inherit'};

  return(
    <div style={{flex:1,overflowY:'auto',minHeight:0}}>
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Sector Allocation</div>
          <div style={{fontSize:13,color:T.text3}}>
            {grouped.length} sectors · {rows.length} holdings · 
            <span style={{color:T.accent,fontWeight:600,marginLeft:4}}>Total Value: ₹{totalValue.toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
          </div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <NvBtn onClick={fetchSectors} disabled={loading} T={T}><Ic.Refresh s={loading}/>{loading?'Fetching sectors…':'Refresh Sectors'}</NvBtn>
          {onClose&&<button onClick={onClose} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:6,cursor:'pointer',color:T.text3,padding:'7px 8px',display:'flex',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}><Ic.X/></button>}
        </div>
      </div>

      {rows.length===0&&<div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:40,textAlign:'center',color:T.text3}}>No holdings found. Add stocks to your portfolio first.</div>}

      {rows.length>0&&(
        <div style={{display:'grid',gridTemplateColumns:'240px 1fr',gap:20,alignItems:'start'}}>
          {/* Donut */}
          <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:16}}>
            <svg width={220} height={220} style={{display:'block',margin:'0 auto'}}>
              {segs.map((s,i)=>(
                <path key={i} d={s.path} fill={s.color} opacity={hover===null||hover===i?1:.25} style={{cursor:'pointer',transition:'opacity .15s'}} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}/>
              ))}
              <text x={CX} y={CY-8} textAnchor="middle" fontSize={11} fill={T.text3} fontFamily="inherit">{hover!==null?segs[hover]?.sector:'All'}</text>
              <text x={CX} y={CY+12} textAnchor="middle" fontSize={16} fontWeight="700" fill={T.text} fontFamily="inherit">{hover!==null?`${(segs[hover]?.frac*100).toFixed(1)}%`:segs.length}</text>
            </svg>
          </div>
          {/* Legend + detail */}
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {grouped.map((g,i)=>(
              <div key={g.sector} style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:'12px 16px',opacity:hover===null||hover===i?1:.4,transition:'opacity .15s'}} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:10,height:10,borderRadius:2,background:SEC_COLORS[i%SEC_COLORS.length],flexShrink:0}}/>
                    <span style={{fontWeight:700,color:T.text,fontSize:13}}>{g.sector}</span>
                    <span style={{fontSize:11,color:T.text3,background:T.surface3,padding:'1px 7px',borderRadius:10}}>{g.holdings.length} stock{g.holdings.length!==1?'s':''}</span>
                  </div>
                  <div style={{display:'flex',gap:20}}>
                    <div style={{textAlign:'right'}}><div style={{fontSize:10,color:T.text3}}>Allocation</div><div style={{fontWeight:700,color:T.text}}>{(g.totalValue/totalValue*100).toFixed(1)}%</div></div>
                    <div style={{textAlign:'right'}}><div style={{fontSize:10,color:T.text3}}>Value</div><div style={{fontWeight:700,color:T.cyan}}>₹{g.totalValue.toLocaleString('en-IN',{maximumFractionDigits:0})}</div></div>
                    <div style={{textAlign:'right'}}><div style={{fontSize:10,color:T.text3}}>P&L</div><div style={{fontWeight:700,color:g.totalGain>=0?T.success:T.danger}}>{g.totalGain>=0?'+':'−'}₹{Math.abs(g.totalGain).toLocaleString('en-IN',{maximumFractionDigits:0})}</div></div>
                  </div>
                </div>
                {/* Allocation bar */}
                <div style={{height:4,background:T.surface4,borderRadius:2,marginBottom:8}}>
                  <div style={{width:`${(g.totalValue/totalValue*100).toFixed(1)}%`,height:'100%',background:SEC_COLORS[i%SEC_COLORS.length],borderRadius:2}}/>
                </div>
                {/* Holdings chips */}
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {g.holdings.map(h=>(
                    <div key={h.symbol+(h.pfName||'')} style={{display:'flex',alignItems:'center',gap:5,background:T.surface3,borderRadius:6,padding:'3px 10px',border:`1px solid ${h.currency==='USD'?T.usColor+'40':T.inColor+'40'}`}}>
                      <span style={{fontSize:10,opacity:.7}}>{h.currency==='USD'?'🇺🇸':'🇮🇳'}</span>
                      <span style={{fontSize:11,fontWeight:600,color:T.text}}>{short(h.symbol)}</span>
                      {h.pfName&&<span style={{fontSize:9,color:T.text3,borderLeft:`1px solid ${T.border}`,paddingLeft:5}}>{h.pfName}</span>}
                      {manualEdit===h.symbol
                          ?<div style={{display:'flex',gap:4,alignItems:'center'}}>
                            <input value={editVal} onChange={e=>setEditVal(e.target.value)} placeholder="Sector" style={{...INP,width:100,padding:'2px 6px'}} autoFocus onKeyDown={e=>{if(e.key==='Enter'&&editVal.trim()){setSectorMap(p=>({...p,[h.symbol]:{sector:editVal.trim(),industry:editVal.trim()}}));setManualEdit(null);}if(e.key==='Escape')setManualEdit(null);}}/>
                            <button onClick={()=>{if(editVal.trim()){setSectorMap(p=>({...p,[h.symbol]:{sector:editVal.trim(),industry:editVal.trim()}}));setManualEdit(null);}}} style={{background:'none',border:'none',cursor:'pointer',color:T.success,padding:2}}><Ic.Check/></button>
                            <button onClick={()=>setManualEdit(null)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:2}}><Ic.X/></button>
                          </div>
                          :<button onClick={()=>{setManualEdit(h.symbol);setEditVal(sectorMap[h.symbol]?.sector||'');}} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:1,fontSize:10}} title="Change sector"><Ic.Pencil/></button>
                      }
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{fontSize:11,color:T.text3}}>Sector data from Yahoo Finance. Click "Refresh Sectors" to fetch. Set manually for any missing stocks.</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: BENCHMARK COMPARISON ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function BenchmarkModule({T,rows,inRows,usRows,usdInr,history,onClose}) {
  const [benchData,setBenchData]=useState({});
  const [loading,setLoading]=useState(false);
  const [range,setRange]=useState('5d');
  const [hover,setHover]=useState(null);
  const svgRef=useRef();

  const RANGES=[{v:'5d',l:'5D'},{v:'1mo',l:'1M'},{v:'3mo',l:'3M'},{v:'6mo',l:'6M'},{v:'1y',l:'1Y'}];
  const BENCHES=[
    {sym:'^NSEI',label:'Nifty 50',color:'#f59e0b'},
    {sym:'^GSPC',label:'S&P 500',color:'#00b4d8'},
  ];

  // Compute portfolio returns for each market
  const inReturn=useMemo(()=>{
    if(!inRows?.length)return null;
    const inv=inRows.reduce((s,r)=>s+r.invested,0);
    const cur=inRows.reduce((s,r)=>s+(r.curValue??r.invested),0);
    return inv?((cur-inv)/inv)*100:null;
  },[inRows]);
  const usReturn=useMemo(()=>{
    if(!usRows?.length)return null;
    const inv=usRows.reduce((s,r)=>s+r.invested,0);
    const cur=usRows.reduce((s,r)=>s+(r.curValue??r.invested),0);
    return inv?((cur-inv)/inv)*100:null;
  },[usRows]);

  const fetchBench=useCallback(async()=>{
    setLoading(true);
    const out={};
    await Promise.all(BENCHES.map(async b=>{
      try{
        const r=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(b.sym)}?interval=1d&range=${range}`,{headers:{Accept:'application/json'}});
        if(r.ok){const j=await r.json();const res=j?.chart?.result?.[0];const ts=res?.timestamp||[];const q=res?.indicators?.quote?.[0]||{};const closes=ts.map((t,i)=>({date:t*1000,close:q.close?.[i]})).filter(d=>d.close!=null);out[b.sym]=closes;}
      }catch{}
    }));
    setBenchData(out);setLoading(false);
  },[range]);

  useEffect(()=>{fetchBench();},[fetchBench]);

  // Combined portfolio return (all holdings, USD converted to INR)
  const portfolioReturn=useMemo(()=>{
    if(!rows.length)return null;
    const toINR=(v,cur)=>cur==='USD'&&usdInr?v*usdInr:v;
    const totalInvested=rows.reduce((s,r)=>s+toINR(r.invested,r.currency||'INR'),0);
    const totalCurrent=rows.reduce((s,r)=>s+toINR(r.curValue??r.invested,r.currency||'INR'),0);
    if(!totalInvested)return null;
    return((totalCurrent-totalInvested)/totalInvested)*100;
  },[rows,usdInr]);


  // Normalize benchmark series to % return from start
  const normalized=useMemo(()=>{
    const out={};
    const toS=ts=>new Date(ts).toISOString().slice(0,10);
    BENCHES.forEach(b=>{
      const s=benchData[b.sym];if(!s||!s.length)return;
      const base=s[0].close;
      out[b.sym]=s.map(d=>({date:toS(d.date),pct:(d.close/base-1)*100}));
    });
    // Normalize portfolio series (Absolute Total Return from snapshots)
    const firstBench=Object.values(out)[0];
    if(firstBench?.length>0 && history.length>0){
      const start=firstBench[0].date, end=firstBench[firstBench.length-1].date;
      const hRange=history.filter(h=>h.date>=start && h.date<=end);
      if(hRange.length>0){
        out['PORT_IN']=hRange.map(h=>({date:h.date,pct:h.inrInv?((h.inrVal/h.inrInv)-1)*100:0}));
        out['PORT_US']=hRange.map(h=>({date:h.date,pct:h.usdInv?((h.usdVal/h.usdInv)-1)*100:0}));
      }
    }
    return out;
  },[benchData, history]);

  // SVG chart — include portfolio returns in the Y-axis range
  const allSeries=Object.values(normalized);
  const allPcts=allSeries.flatMap(s=>s.map(d=>d.pct)).filter(v=>v!=null&&!isNaN(v));
  const minP=allPcts.length?Math.min(...allPcts,-5):-5,maxP=allPcts.length?Math.max(...allPcts,5):5;
  const range_=maxP-minP||10;
  const dates=allSeries[0]?.map(d=>d.date)||[];
  const VW=700,VH=200,PAD={t:16,r:16,b:32,l:52};
  const W=VW-PAD.l-PAD.r,H=VH-PAD.t-PAD.b;
  const xOf=i=>PAD.l+(dates.length>1?(i/(dates.length-1))*W:W);
  const yOf=p=>PAD.t+H-((p-minP)/range_)*H;
  const yZero=yOf(0);

  return(
    <div style={{flex:1,overflowY:'auto',minHeight:0}}>
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Benchmark Comparison</div>
          <div style={{fontSize:13,color:T.text3}}>Portfolio Manager Pro (v4.7.4)</div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {RANGES.map(r=>(
              <button key={r.v} onClick={()=>setRange(r.v)} style={{padding:'6px 14px',borderRadius:6,border:`1px solid ${range===r.v?T.accent:T.border2}`,background:range===r.v?T.accentBg:'transparent',color:range===r.v?T.accent:T.text2,cursor:'pointer',fontSize:12,fontWeight:range===r.v?700:400,transition:'all .12s'}}>{r.l}</button>
            ))}
            <NvBtn onClick={fetchBench} disabled={loading} T={T}><Ic.Refresh s={loading}/></NvBtn>
          </div>
          {onClose&&<button onClick={onClose} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:6,cursor:'pointer',color:T.text3,padding:'7px 8px',display:'flex',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}><Ic.X/></button>}
        </div>
      </div>

      {/* Chart */}
      <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:'16px 12px'}}>
        {loading?<div style={{height:200,display:'flex',alignItems:'center',justifyContent:'center',color:T.text3}}>Loading benchmark data…</div>:
        !allSeries.length?<div style={{height:200,display:'flex',alignItems:'center',justifyContent:'center',color:T.text3}}>No data available</div>:(
          <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" style={{width:'100%',height:'auto',display:'block'}} onMouseMove={e=>{if(!svgRef.current)return;const rect=svgRef.current.getBoundingClientRect();const sx=((e.clientX-rect.left)/rect.width)*VW;const i=Math.max(0,Math.min(dates.length-1,Math.round(((sx-PAD.l)/W)*(dates.length-1))));setHover(i);}} onMouseLeave={()=>setHover(null)}>
            {/* Zero line */}
            <line x1={PAD.l} y1={yZero} x2={PAD.l+W} y2={yZero} stroke={T.border} strokeWidth="1"/>
            <text x={PAD.l-4} y={yZero+4} fontSize={8} fill={T.text3} fontFamily="inherit" textAnchor="end">0%</text>
            {/* Grid */}
            {[-10,-5,5,10,15,20].map(p=>(p>minP&&p<maxP)&&(
              <g key={p}><line x1={PAD.l} y1={yOf(p)} x2={PAD.l+W} y2={yOf(p)} stroke={T.border} strokeWidth="0.5" strokeDasharray="3 3"/><text x={PAD.l-4} y={yOf(p)+4} fontSize={8} fill={T.text3} fontFamily="inherit" textAnchor="end">{p}%</text></g>
            ))}
            {/* Benchmark lines */}
            {BENCHES.map(b=>{
              const s=normalized[b.sym];if(!s)return null;
              const path=s.map((d,i)=>`${i===0?'M':'L'}${xOf(i).toFixed(1)},${yOf(d.pct).toFixed(1)}`).join(' ');
              return<path key={b.sym} d={path} fill="none" stroke={b.color} strokeWidth="2"/>;
            })}
            {normalized['PORT_IN']?.length>0&&(
              <>
                {normalized['PORT_IN'].length>1 ? (
                  <path d={normalized['PORT_IN'].map((d,i)=>{
                    const idx=dates.indexOf(d.date);
                    return `${i===0?'M':'L'}${xOf(idx!==-1?idx:i).toFixed(1)},${yOf(d.pct).toFixed(1)}`;
                  }).join(' ')} fill="none" stroke="#ff9800" strokeWidth="2" strokeDasharray="5 3"/>
                ) : null}
                {normalized['PORT_IN'].map(d=>{
                  const idx=dates.indexOf(d.date);
                  return <circle key={d.date} cx={xOf(idx!==-1?idx:0)} cy={yOf(d.pct)} r="3" fill="#ff9800" />;
                })}
              </>
            )}
            {normalized['PORT_US']?.length>0&&(
              <>
                {normalized['PORT_US'].length>1 ? (
                  <path d={normalized['PORT_US'].map((d,i)=>{
                    const idx=dates.indexOf(d.date);
                    return `${i===0?'M':'L'}${xOf(idx!==-1?idx:i).toFixed(1)},${yOf(d.pct).toFixed(1)}`;
                  }).join(' ')} fill="none" stroke="#00b4d8" strokeWidth="2" strokeDasharray="5 3"/>
                ) : null}
                {normalized['PORT_US'].map(d=>{
                  const idx=dates.indexOf(d.date);
                  return <circle key={d.date} cx={xOf(idx!==-1?idx:0)} cy={yOf(d.pct)} r="3" fill="#00b4d8" />;
                })}
              </>
            )}
            {/* X axis dates */}
            {dates.filter((_,i)=>i%Math.max(1,Math.floor(dates.length/6))===0).map((d,i)=>{
              const idx=dates.indexOf(d);
              return<text key={i} x={xOf(idx)} y={PAD.t+H+14} fontSize={8} fill={T.text3} fontFamily="inherit" textAnchor="middle">{new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</text>;
            })}
            {/* Hover */}
            {hover!==null&&dates[hover]&&(
              <g>
                <line x1={xOf(hover)} y1={PAD.t} x2={xOf(hover)} y2={PAD.t+H} stroke={T.border2} strokeWidth="0.8"/>
                <rect x={Math.min(xOf(hover)+8,VW-130)} y={PAD.t+4} width={135} height={(BENCHES.length+(inReturn!=null?1:0)+(usReturn!=null?1:0))*18+20} rx={4} fill={T.surface2} stroke={T.border2} strokeWidth="0.8"/>
                <text x={Math.min(xOf(hover)+14,VW-124)} y={PAD.t+16} fontSize={8} fill={T.text3} fontFamily="inherit">{new Date(dates[hover]).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</text>
                {BENCHES.map((b,i)=>{const s=normalized[b.sym];const pt=s?.[hover];return pt?<text key={b.sym} x={Math.min(xOf(hover)+14,VW-124)} y={PAD.t+30+i*18} fontSize={10} fill={b.color} fontFamily="inherit" fontWeight="700">{b.label}: {pt.pct>=0?'+':''}{pt.pct.toFixed(2)}%</text>:null;})}
                {normalized['PORT_IN'] && (()=>{
                  const pt=normalized['PORT_IN'].find(x=>x.date===dates[hover]);
                  return pt?<text x={Math.min(xOf(hover)+14,VW-124)} y={PAD.t+30+BENCHES.length*18} fontSize={10} fill="#ff9800" fontFamily="inherit" fontWeight="700">🇮🇳 Portfolio: {pt.pct>=0?'+':''}{pt.pct.toFixed(2)}%</text>:null;
                })()}
                {normalized['PORT_US'] && (()=>{
                  const pt=normalized['PORT_US'].find(x=>x.date===dates[hover]);
                  return pt?<text x={Math.min(xOf(hover)+14,VW-124)} y={PAD.t+30+(BENCHES.length+1)*18} fontSize={10} fill="#00b4d8" fontFamily="inherit" fontWeight="700">🇺🇸 Portfolio: {pt.pct>=0?'+':''}{pt.pct.toFixed(2)}%</text>:null;
                })()}
              </g>
            )}
          </svg>
        )}
        {/* Legend */}
        <div style={{display:'flex',gap:20,justifyContent:'center',marginTop:8}}>
          {BENCHES.map(b=>{const s=normalized[b.sym];const last=s?.[s.length-1]?.pct;return(
            <div key={b.sym} style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:20,height:2,background:b.color,borderRadius:1}}/>
              <span style={{fontSize:12,color:T.text2}}>{b.label}</span>
              {last!=null&&<span style={{fontSize:12,fontWeight:700,color:last>=0?T.success:T.danger}}>{last>=0?'+':''}{last.toFixed(2)}%</span>}
            </div>
          );})}
          {normalized['PORT_IN']?.length>0&&(
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:20,height:2,background:'#ff9800',borderRadius:1,border:'1px dashed #ff9800'}}/>
              <span style={{fontSize:12,color:T.text2}}>🇮🇳 Portfolio</span>
              {(()=>{const s=normalized['PORT_IN'];const last=s[s.length-1]?.pct;return last!=null&&<span style={{fontSize:12,fontWeight:700,color:last>=0?T.success:T.danger}}>{last>=0?'+':''}{last.toFixed(2)}%</span>;})()}
            </div>
          )}
          {normalized['PORT_US']?.length>0&&(
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:20,height:2,background:'#00b4d8',borderRadius:1,border:'1px dashed #00b4d8'}}/>
              <span style={{fontSize:12,color:T.text2}}>🇺🇸 Portfolio</span>
              {(()=>{const s=normalized['PORT_US'];const last=s[s.length-1]?.pct;return last!=null&&<span style={{fontSize:12,fontWeight:700,color:last>=0?T.success:T.danger}}>{last>=0?'+':''}{last.toFixed(2)}%</span>;})()}
            </div>
          )}
        </div>
      </div>

      {/* Performance table */}
      {allSeries.length>0&&(
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`}}>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>Performance Summary</span>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{background:T.surface3}}>{['Index','Start','Current','Return','High','Low'].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',color:T.text3,fontWeight:700,fontSize:11,borderBottom:`1px solid ${T.border}`}}>{h}</th>)}</tr></thead>
            <tbody>
              {inReturn!=null&&(
                <tr style={{background:'rgba(255,152,0,.08)'}}>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`}}><div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:12}}>🇮🇳</span><span style={{fontWeight:700,color:T.inColor}}>Indian Portfolio</span></div></td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.text2}}>₹{inRows.reduce((s,r)=>s+r.invested,0).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.cyan,fontWeight:700}}>₹{inRows.reduce((s,r)=>s+(r.curValue??r.invested),0).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,fontWeight:700,color:inReturn>=0?T.success:T.danger}}>{inReturn>=0?'+':''}{inReturn.toFixed(2)}%</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.text3}}>vs Nifty 50</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.text3}}>{(()=>{const s=normalized['^NSEI'];return s?`${s[s.length-1]?.pct>=0?'+':''}${s[s.length-1]?.pct?.toFixed(2)}%`:'—';})()}</td>
                </tr>
              )}
              {usReturn!=null&&(
                <tr style={{background:'rgba(0,180,216,.08)'}}>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`}}><div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:12}}>🇺🇸</span><span style={{fontWeight:700,color:T.usColor}}>US Portfolio</span></div></td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.text2}}>${usRows.reduce((s,r)=>s+r.invested,0).toLocaleString('en-US',{maximumFractionDigits:0})}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.cyan,fontWeight:700}}>${usRows.reduce((s,r)=>s+(r.curValue??r.invested),0).toLocaleString('en-US',{maximumFractionDigits:0})}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,fontWeight:700,color:usReturn>=0?T.success:T.danger}}>{usReturn>=0?'+':''}{usReturn.toFixed(2)}%</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.text3}}>vs S&P 500</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.text3}}>{(()=>{const s=normalized['^GSPC'];return s?`${s[s.length-1]?.pct>=0?'+':''}${s[s.length-1]?.pct?.toFixed(2)}%`:'—';})()}</td>
                </tr>
              )}
              {BENCHES.map((b,i)=>{
              const s=normalized[b.sym];const raw=benchData[b.sym];if(!s||!raw)return null;
              const ret=s[s.length-1]?.pct??0;const hi=Math.max(...s.map(d=>d.pct));const lo=Math.min(...s.map(d=>d.pct));
              return(
                <tr key={b.sym} style={{background:i%2===0?T.surface2:T.surface3}}>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`}}><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:8,height:8,borderRadius:2,background:b.color}}/><span style={{fontWeight:700,color:T.text}}>{b.label}</span></div></td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.text2}}>{raw[0]?.close?.toFixed(2)}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.cyan,fontWeight:700}}>{raw[raw.length-1]?.close?.toFixed(2)}</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,fontWeight:700,color:ret>=0?T.success:T.danger}}>{ret>=0?'+':''}{ret.toFixed(2)}%</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.success}}>+{hi.toFixed(2)}%</td>
                  <td style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,color:T.danger}}>{lo.toFixed(2)}%</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: SCREENER ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// Fetches key fundamentals from Yahoo v10 quoteSummary for all portfolio stocks.
// Links to Screener.in (Indian) and Yahoo Finance (US).

export function ScreenerModule({T,holdings,prices,onClose}) {
  const [data,setData]=useState({});
  const [loading,setLoading]=useState(false);
  const [progress,setProgress]=useState(0);
  const [error,setError]=useState(null);
  const [sort,setSort]=useState({col:'symbol',dir:'asc'});
  const [filter,setFilter]=useState('all'); // all | IN | US

  const fetchAll=useCallback(async()=>{
    if(!holdings.length)return;
    setLoading(true);
    setProgress(0);
    setError(null);
    let count=0;
    
    // 1. First Pass: Use BATCHED v7 API for basic stats (very reliable)
    // Yahoo allows up to 50 symbols in one v7/quote request
    const symList=holdings.map(h=>encodeURIComponent(h.symbol));
    const chunks=[];
    for(let i=0;i<symList.length;i+=40)chunks.push(symList.slice(i,i+40));
    
    const baseStats={};
    for(const chunk of chunks){
      for(const host of ['query1','query2']){
        try{
          const r=await fetch(`https://${host}.finance.yahoo.com/v7/finance/quote?symbols=${chunk.join(',')}`,{headers:{Accept:'application/json'}});
          if(r.ok){
            const j=await r.json();
            const results=j?.quoteResponse?.result||[];
            results.forEach(res=>{
              const h=holdings.find(x=>x.symbol===res.symbol)||{};
              baseStats[res.symbol]={
                name:h.name||res.shortName||res.symbol,symbol:res.symbol,isUS:isUS(res.symbol),
                currency:res.currency||'INR',
                marketCap:res.marketCap||null,
                pe:res.trailingPE||null,
                forwardPE:res.forwardPE||null,
                pb:res.priceToBook||null,
                eps:res.trailingEps||null,
                divYield:(res.trailingAnnualDividendYield||0)*100,
                roe:null,debtToEquity:null,
                fiftyTwoWeekHigh:res.fiftyTwoWeekHigh||null,
                fiftyTwoWeekLow:res.fiftyTwoWeekLow||null,
                beta:res.beta||null,
                curPrice:prices[res.symbol]?.current||res.regularMarketPrice||null,
                revenueGrowth:null,profitMargin:null,targetMean:null,recommendation:null
              };
            });
            break;
          }
        }catch(e){}
      }
    }
    
    // Show what we have so far
    setData({...baseStats});
    count=Object.keys(baseStats).length;
    setProgress(Math.round((count/holdings.length)*50)); // 50% progress for first pass

    // 2. Second Pass: Enrich with v10 quoteSummary for detailed metrics (ROE, Margin, etc.)
    // Only fetch for stocks we found in the first pass
    const foundSyms=Object.keys(baseStats);
    const batches=[];
    for(let i=0;i<foundSyms.length;i+=5)batches.push(foundSyms.slice(i,i+5));
    
    for(const batch of batches){
      await Promise.all(batch.map(async symbol=>{
        for(const host of ['query1','query2']){
          try {
            const ctrl=new AbortController();
            const tid=setTimeout(()=>ctrl.abort(),5000);
            const r=await fetch(`https://${host}.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryDetail,defaultKeyStatistics,financialData`,{headers:{Accept:'application/json'},signal:ctrl.signal});
            clearTimeout(tid);
            if(r.ok){
              const j=await r.json();const res=j?.quoteSummary?.result?.[0];
              if(res){
                const sd=res.summaryDetail||{}, ks=res.defaultKeyStatistics||{}, fd=res.financialData||{};
                const n=v=>v==null?null:(typeof v==='object'&&'raw' in v?v.raw:v);
                setData(prev=>({
                  ...prev,
                  [symbol]:{
                    ...prev[symbol],
                    roe:n(fd.returnOnEquity)!=null?(n(fd.returnOnEquity)*100):prev[symbol].roe,
                    debtToEquity:n(fd.debtToEquity)??prev[symbol].debtToEquity,
                    revenueGrowth:n(fd.revenueGrowth)!=null?(n(fd.revenueGrowth)*100):prev[symbol].revenueGrowth,
                    profitMargin:n(fd.profitMargins)!=null?(n(fd.profitMargins)*100):prev[symbol].profitMargin,
                    targetMean:n(fd.targetMeanPrice)??prev[symbol].targetMean,
                    recommendation:fd.recommendationKey||prev[symbol].recommendation,
                  }
                }));
                break;
              }
            }
          } catch(e) {}
        }
        count++;
        setProgress(Math.round((count/(holdings.length+foundSyms.length))*100));
      }));
      await new Promise(r=>setTimeout(r,100));
    }

    setLoading(false);
    if(Object.keys(baseStats).length===0)setError('Connection Error. Could not retrieve stock data. Please check your internet or firewall settings.');
  },[holdings,prices]);

  useEffect(()=>{fetchAll();},[fetchAll]);

  const rows=useMemo(()=>{
    let arr=Object.values(data);
    if(filter==='IN')arr=arr.filter(r=>!r.isUS);
    if(filter==='US')arr=arr.filter(r=>r.isUS);
    return sortRows(arr,sort.col,sort.dir);
  },[data,filter,sort]);

  const onSort=col=>setSort(p=>({col,dir:p.col===col&&p.dir==='asc'?'desc':'asc'}));
  const thS={padding:'8px 10px',fontSize:11,fontWeight:700,color:T.text3,cursor:'pointer',whiteSpace:'nowrap',borderBottom:`1px solid ${T.border}`,background:T.surface2,textAlign:'right',userSelect:'none'};
  const tdS={padding:'8px 10px',fontSize:12,borderBottom:`1px solid ${T.border}`,textAlign:'right',color:T.text2};
  const arrow=col=>sort.col===col?(sort.dir==='asc'?' ▲':' ▼'):'';

  const screenerLink=r=>r.isUS
    ?`https://finance.yahoo.com/quote/${encodeURIComponent(r.symbol)}/`
    :`https://www.screener.in/company/${short(r.symbol)}/consolidated/`;

  const fmtMC=r=>{
    const v=r.marketCap;if(!v)return'—';
    if(r.isUS){
      if(v>=1e12)return`$${(v/1e12).toFixed(2)}T`;
      if(v>=1e9)return`$${(v/1e9).toFixed(1)}B`;
      return`$${(v/1e6).toFixed(0)}M`;
    }
    if(v>=1e12)return`₹${(v/1e12).toFixed(2)}T`;
    if(v>=1e7)return`₹${(v/1e7).toFixed(0)}Cr`;
    return`₹${(v/1e5).toFixed(0)}L`;
  };

  const fmtN=(v,d=2)=>v==null?'—':v.toFixed(d);
  const fmtP=(v)=>v==null?'—':`${v.toFixed(1)}%`;

  return(
    <div style={{flex:1,overflowY:'auto',minHeight:0}}>
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Screener</div>
          <div style={{fontSize:13,color:T.text3}}>Fundamentals for {holdings.length} holdings · Click any stock to open on {filter==='US'?'Yahoo Finance':'Screener.in'}</div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {['all','IN','US'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{padding:'6px 14px',borderRadius:6,border:`1px solid ${filter===f?T.accent:T.border2}`,background:filter===f?T.accentBg:'transparent',color:filter===f?T.accent:T.text2,cursor:'pointer',fontSize:12,fontWeight:filter===f?700:400}}>{f==='all'?'All':f==='IN'?'🇮🇳 Indian':'🇺🇸 US'}</button>
            ))}
            <NvBtn onClick={fetchAll} disabled={loading} T={T}><Ic.Refresh s={loading}/></NvBtn>
          </div>
          {onClose&&<button onClick={onClose} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:6,cursor:'pointer',color:T.text3,padding:'7px 8px',display:'flex',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}><Ic.X/></button>}
        </div>
      </div>

      <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden',minHeight:240}}>
        {loading&&!rows.length?(
          <div style={{padding:60,textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
            <div style={{width:200,height:6,background:T.surface3,borderRadius:3,overflow:'hidden'}}>
              <div style={{width:`${progress}%`,height:'100%',background:T.accent,transition:'width .3s ease'}}/>
            </div>
            <div style={{fontSize:14,color:T.text,fontWeight:600}}>Fetching fundamentals… {progress}%</div>
            <div style={{fontSize:12,color:T.text3}}>Retrieving data for {holdings.length} stocks. Please wait.</div>
          </div>
        ):error?(
          <div style={{padding:60,textAlign:'center',color:T.danger}}>
            <div style={{fontSize:16,fontWeight:700,marginBottom:10}}>Connection Error</div>
            <div style={{fontSize:13,marginBottom:20,maxWidth:400,margin:'0 auto'}}>{error}</div>
            <NvBtn onClick={fetchAll} variant="primary" T={T}><Ic.Refresh/> Try Again</NvBtn>
          </div>
        ):!rows.length?(
          <div style={{padding:60,textAlign:'center',color:T.text3}}>
            <div style={{fontSize:15,fontWeight:600,marginBottom:8}}>No Data Found</div>
            <div style={{fontSize:13,marginBottom:20}}>Could not load fundamentals for your current holdings.</div>
            <NvBtn onClick={fetchAll} variant="primary" T={T}><Ic.Refresh/> Load Fundamentals</NvBtn>
          </div>
        ):(
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr>
              <th onClick={()=>onSort('symbol')} style={{...thS,textAlign:'left',position:'sticky',left:0,zIndex:1,background:T.surface2,minWidth:130}}>Stock{arrow('symbol')}</th>
              <th onClick={()=>onSort('marketCap')} style={thS}>Mkt Cap{arrow('marketCap')}</th>
              <th onClick={()=>onSort('pe')} style={thS}>PE{arrow('pe')}</th>
              <th onClick={()=>onSort('forwardPE')} style={thS}>Fwd PE{arrow('forwardPE')}</th>
              <th onClick={()=>onSort('pb')} style={thS}>PB{arrow('pb')}</th>
              <th onClick={()=>onSort('eps')} style={thS}>EPS{arrow('eps')}</th>
              <th onClick={()=>onSort('roe')} style={thS}>ROE{arrow('roe')}</th>
              <th onClick={()=>onSort('debtToEquity')} style={thS}>D/E{arrow('debtToEquity')}</th>
              <th onClick={()=>onSort('divYield')} style={thS}>Div %{arrow('divYield')}</th>
              <th onClick={()=>onSort('profitMargin')} style={thS}>Margin{arrow('profitMargin')}</th>
              <th onClick={()=>onSort('revenueGrowth')} style={thS}>Rev Gr{arrow('revenueGrowth')}</th>
              <th onClick={()=>onSort('beta')} style={thS}>Beta{arrow('beta')}</th>
              <th onClick={()=>onSort('fiftyTwoWeekLow')} style={thS}>52W Low{arrow('fiftyTwoWeekLow')}</th>
              <th onClick={()=>onSort('fiftyTwoWeekHigh')} style={thS}>52W High{arrow('fiftyTwoWeekHigh')}</th>
              <th onClick={()=>onSort('recommendation')} style={thS}>Rating{arrow('recommendation')}</th>
            </tr></thead>
            <tbody>
              {!rows.length&&<tr><td colSpan={15} style={{padding:32,textAlign:'center',color:T.text3}}>No data. Click refresh to load fundamentals.</td></tr>}
              {rows.map((r,i)=>{
                const cur=r.curPrice;const hi=r.fiftyTwoWeekHigh;const lo=r.fiftyTwoWeekLow;
                const fromHi=cur&&hi?((cur-hi)/hi*100):null;
                const fromLo=cur&&lo?((cur-lo)/lo*100):null;
                const ratingColor={buy:T.success,strong_buy:T.success,hold:T.warning,sell:T.danger,strong_sell:T.danger,underperform:T.danger,outperform:T.success}[r.recommendation]||T.text3;
                return(
                <tr key={r.symbol} style={{background:i%2===0?'transparent':T.surface3,cursor:'pointer',transition:'background .08s'}} onClick={()=>window.open(screenerLink(r),'_blank')} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':T.surface3}>
                  <td style={{...tdS,textAlign:'left',position:'sticky',left:0,background:'inherit',zIndex:1,borderRight:`1px solid ${T.border}`}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:28,height:28,borderRadius:6,background:r.isUS?'rgba(0,180,216,.12)':'rgba(255,152,0,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:r.isUS?T.usColor:T.inColor,flexShrink:0}}>{short(r.symbol).slice(0,2)}</div>
                      <div><div style={{fontWeight:700,color:T.text,fontSize:12}}>{short(r.symbol)}</div><div style={{fontSize:10,color:T.text3,maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name}</div></div>
                    </div>
                  </td>
                  <td style={tdS}><span style={{color:T.text,fontWeight:600}}>{fmtMC(r)}</span></td>
                  <td style={{...tdS,color:r.pe!=null&&r.pe<25?T.success:r.pe!=null&&r.pe>40?T.danger:T.text2}}>{fmtN(r.pe,1)}</td>
                  <td style={tdS}>{fmtN(r.forwardPE,1)}</td>
                  <td style={{...tdS,color:r.pb!=null&&r.pb<3?T.success:r.pb!=null&&r.pb>10?T.danger:T.text2}}>{fmtN(r.pb,1)}</td>
                  <td style={tdS}>{fmtN(r.eps,1)}</td>
                  <td style={{...tdS,color:r.roe!=null&&r.roe>15?T.success:r.roe!=null&&r.roe<10?T.danger:T.text2}}>{fmtP(r.roe)}</td>
                  <td style={{...tdS,color:r.debtToEquity!=null&&r.debtToEquity>100?T.danger:T.text2}}>{fmtN(r.debtToEquity,0)}</td>
                  <td style={{...tdS,color:r.divYield>2?T.success:T.text2}}>{fmtP(r.divYield)}</td>
                  <td style={{...tdS,color:r.profitMargin!=null&&r.profitMargin>15?T.success:T.text2}}>{fmtP(r.profitMargin)}</td>
                  <td style={{...tdS,color:r.revenueGrowth!=null&&r.revenueGrowth>10?T.success:r.revenueGrowth!=null&&r.revenueGrowth<0?T.danger:T.text2}}>{fmtP(r.revenueGrowth)}</td>
                  <td style={tdS}>{fmtN(r.beta,2)}</td>
                  <td style={tdS}><div>{r.isUS?'$':'\u20b9'}{fmtN(r.fiftyTwoWeekLow,0)}</div>{fromLo!=null&&<div style={{fontSize:9,color:T.success}}>+{fromLo.toFixed(0)}%</div>}</td>
                  <td style={tdS}><div>{r.isUS?'$':'\u20b9'}{fmtN(r.fiftyTwoWeekHigh,0)}</div>{fromHi!=null&&<div style={{fontSize:9,color:T.danger}}>{fromHi.toFixed(0)}%</div>}</td>
                  <td style={{...tdS,fontWeight:700,color:ratingColor,textTransform:'uppercase',fontSize:10}}>{r.recommendation||'—'}</td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
        )}
      </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: NEWS FEED ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// Fetches latest news from Yahoo Finance for portfolio stocks + market indices.

export function NewsModule({T,holdings,onClose}) {
  const [news,setNews]=useState([]);
  const [loading,setLoading]=useState(false);
  const [filter,setFilter]=useState('all'); // all | portfolio | market
  const [expandedId,setExpandedId]=useState(null);

  const fetchNews=useCallback(async()=>{
    setLoading(true);
    const allNews=[];
    const seen=new Set();

    // Fetch news for portfolio stocks (batch in groups to avoid rate limits)
    const symbols=[...holdings.map(h=>h.symbol),'NIFTY','S&P 500','Indian economy','US markets'].slice(0,12);
    await Promise.all(symbols.map(async (sym,idx)=>{
      try{
        await new Promise(r=>setTimeout(r,idx*100)); // stagger requests
        const q=sym.includes(' ')?sym:short(sym);
        const host=idx%2===0?'query1':'query2';
        const r=await fetch(`https://${host}.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=0&newsCount=6&lang=en-US`,{headers:{Accept:'application/json'}});
        if(!r.ok)return;
        const j=await r.json();
        const items=(j?.news||[]).filter(n=>n.title&&n.link).map(n=>({
          id:n.uuid||n.link,
          title:n.title,
          link:n.link,
          publisher:n.publisher||'',
          publishedAt:n.providerPublishTime?n.providerPublishTime*1000:null,
          thumbnail:n.thumbnail?.resolutions?.[0]?.url||null,
          relatedSymbol:sym.includes(' ')?null:sym,
          isMarket:sym.includes(' '),
          snippet:n.title,
        }));
        items.forEach(n=>{if(!seen.has(n.id)){seen.add(n.id);allNews.push(n);}});
      }catch{}
    }));

    // Sort by publish time (newest first)
    allNews.sort((a,b)=>(b.publishedAt||0)-(a.publishedAt||0));
    setNews(allNews);setLoading(false);
  },[holdings]);

  useEffect(()=>{fetchNews();},[]);

  const filtered=useMemo(()=>{
    if(filter==='portfolio')return news.filter(n=>!n.isMarket);
    if(filter==='market')return news.filter(n=>n.isMarket);
    return news;
  },[news,filter]);

  const timeAgo=ts=>{
    if(!ts)return'';
    const diff=Date.now()-ts;
    const mins=Math.floor(diff/60000);
    if(mins<60)return`${mins}m ago`;
    const hrs=Math.floor(mins/60);
    if(hrs<24)return`${hrs}h ago`;
    const days=Math.floor(hrs/24);
    return`${days}d ago`;
  };

  return(
    <div style={{flex:1,overflowY:'auto',minHeight:0}}>
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>News Feed</div>
          <div style={{fontSize:13,color:T.text3}}>{filtered.length} articles · Portfolio stocks + market news</div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {[['all','All'],['portfolio','Portfolio'],['market','Market']].map(([k,l])=>(
              <button key={k} onClick={()=>setFilter(k)} style={{padding:'6px 14px',borderRadius:6,border:`1px solid ${filter===k?T.accent:T.border2}`,background:filter===k?T.accentBg:'transparent',color:filter===k?T.accent:T.text2,cursor:'pointer',fontSize:12,fontWeight:filter===k?700:400}}>{l}</button>
            ))}
            <NvBtn onClick={fetchNews} disabled={loading} T={T}><Ic.Refresh s={loading}/></NvBtn>
          </div>
          {onClose&&<button onClick={onClose} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:6,cursor:'pointer',color:T.text3,padding:'7px 8px',display:'flex',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}><Ic.X/></button>}
        </div>
      </div>

      {loading&&!news.length?<div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:40,textAlign:'center',color:T.text3}}>Fetching latest news…</div>:(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {!filtered.length&&<div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:40,textAlign:'center',color:T.text3}}>No news found. Try refreshing.</div>}
          {filtered.map(n=>(
            <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none',background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:'14px 16px',display:'flex',gap:14,alignItems:'flex-start',cursor:'pointer',transition:'all .12s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.background=T.surface3;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background=T.surface2;}}>
              {n.thumbnail&&<img src={n.thumbnail} alt="" style={{width:80,height:56,objectFit:'cover',borderRadius:6,flexShrink:0,background:T.surface4}} onError={e=>{e.target.style.display='none';}}/>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:T.text,lineHeight:1.4,marginBottom:4}}>{n.title}</div>
                <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
                  {n.relatedSymbol&&<span style={{padding:'2px 8px',borderRadius:4,background:isUS(n.relatedSymbol)?'rgba(0,180,216,.12)':'rgba(255,152,0,.12)',color:isUS(n.relatedSymbol)?T.usColor:T.inColor,fontSize:10,fontWeight:700}}>{short(n.relatedSymbol)}</span>}
                  {n.publisher&&<span style={{fontSize:11,color:T.text3}}>{n.publisher}</span>}
                  {n.publishedAt&&<span style={{fontSize:11,color:T.text3}}>{timeAgo(n.publishedAt)}</span>}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: HISTORICAL PORTFOLIO VALUE ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// Auto-snapshots on every price refresh. Storage: pm_portfolio_history

export function HistoryModule({T,history,setHistory,onClose}) {
  const [hover,setHover]=useState(null);

  const data=useMemo(()=>history.filter(h=>h.inrVal>0).sort((a,b)=>a.date.localeCompare(b.date)),[history]);

  if(!data.length)return(
    <div style={{flex:1,overflowY:'auto',minHeight:0}}>
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{fontSize:20,fontWeight:700,color:T.text}}>Asset Performance Dashboard</div>
      <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:40,textAlign:'center',color:T.text3}}>No history yet. Snapshots are saved automatically each time prices refresh. Come back tomorrow!</div>
      </div>
    </div>
  );

  const latest = data[data.length-1];
  const gain = latest.inrVal - (latest.inrInv || data[0].inrVal);
  const gainPct = latest.inrInv > 0 ? (gain / latest.inrInv) * 100 : 0;
  const isUp = gain >= 0;
  const lc = isUp ? T.success : T.danger;

  return(
    <div style={{flex:1,overflowY:'auto',minHeight:0}}>
      <div style={{padding:'24px 32px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h2 style={{fontSize:22,fontWeight:800,color:T.text,letterSpacing:'-0.02em',marginBottom:4}}>Asset Performance Dashboard</h2>
          <div style={{fontSize:13,color:T.text3}}>{data.length} historical snapshots recorded</div>
        </div>
        <div style={{display:'flex',gap:24}}>
          <div style={{textAlign:'right'}}><div style={{fontSize:11,color:T.text3}}>Stocks Value</div><div style={{fontSize:18,fontWeight:700,color:T.text}}>₹{latest.portfolioVal?.toLocaleString('en-IN') || (latest.inrEquityVal + Math.round((latest.usdEquityVal||0)*(latest.usdInr||83.5))).toLocaleString('en-IN')}</div></div>
          <div style={{textAlign:'right'}}><div style={{fontSize:11,color:T.text3}}>NPS Value</div><div style={{fontSize:18,fontWeight:700,color:T.success}}>₹{latest.npsVal?.toLocaleString('en-IN')}</div></div>
          <div style={{textAlign:'right'}}><div style={{fontSize:11,color:T.text3}}>Gold Value</div><div style={{fontSize:18,fontWeight:700,color:'#FFD700'}}>₹{latest.goldVal?.toLocaleString('en-IN')}</div></div>
          <div style={{textAlign:'right'}}><div style={{fontSize:11,color:T.text3}}>Total Value</div><div style={{fontSize:18,fontWeight:700,color:T.accent}}>₹{latest.inrVal.toLocaleString('en-IN')}</div></div>
          <div style={{textAlign:'right'}}><div style={{fontSize:11,color:T.text3}}>Total P&L</div><div style={{fontSize:18,fontWeight:700,color:lc}}>{gain>=0?'+':'−'}₹{Math.abs(gain).toLocaleString('en-IN',{maximumFractionDigits:0})} ({gainPct>=0?'+':''}{gainPct.toFixed(2)}%)</div></div>
        </div>
        <button onClick={onClose} style={{marginLeft:20,background:T.surface2,border:`1px solid ${T.border}`,color:T.text3,padding:8,borderRadius:8,cursor:'pointer'}}><Ic.X size={18}/></button>
      </div>

      <div style={{padding:'0 32px 32px',display:'flex',flexDirection:'column',gap:24}}>
        <div style={{background:T.surface2,borderRadius:12,border:`1px solid ${T.border}`,padding:'20px',boxShadow:'0 4px 20px rgba(0,0,0,0.1)'}}>
          <div style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
            <Ic.TrendingUp size={18} color={T.accent}/> Current Asset Allocation & Performance
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr style={{borderBottom:`2px solid ${T.border}`}}>
                  <th style={{padding:'12px 16px',textAlign:'left',color:T.text3,fontSize:11,fontWeight:700,textTransform:'uppercase'}}>Asset Class</th>
                  <th style={{padding:'12px 16px',textAlign:'right',color:T.text3,fontSize:11,fontWeight:700,textTransform:'uppercase'}}>Investment</th>
                  <th style={{padding:'12px 16px',textAlign:'right',color:T.text3,fontSize:11,fontWeight:700,textTransform:'uppercase'}}>Current Value</th>
                  <th style={{padding:'12px 16px',textAlign:'right',color:T.text3,fontSize:11,fontWeight:700,textTransform:'uppercase'}}>Gains</th>
                  <th style={{padding:'12px 16px',textAlign:'right',color:T.text3,fontSize:11,fontWeight:700,textTransform:'uppercase'}}>Gains %</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Indian Equity', cur: latest.inrEquityVal, inv: latest.inrEquityInv, symbol: '💹' },
                  { label: 'US Equity',     cur: latest.usdEquityVal > 0 ? Math.round(latest.usdEquityVal * (latest.usdInr || 83.5)) : 0, inv: latest.usdEquityInv > 0 ? Math.round(latest.usdEquityInv * (latest.usdInr || 83.5)) : 0, symbol: '🌐' },
                  { label: 'NPS Portfolio', cur: latest.npsVal, inv: latest.npsInv, symbol: '🛡️' },
                  { label: 'Physical Gold', cur: latest.goldVal, inv: latest.goldInv, symbol: '🟡' },
                ].map((row,idx) => {
                  const rInv = row.inv || 0;
                  const rCur = row.cur || 0;
                  const gain = rCur - rInv;
                  const pct = rInv > 0 ? (gain / rInv) * 100 : 0;
                  const hasData = rInv > 0 || rCur > 0;
                  return (
                    <tr key={idx} style={{borderBottom:`1px solid ${T.border}`,transition:'background .1s'}} onMouseEnter={e=>e.currentTarget.style.background=T.surface3} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{padding:'16px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                          <span style={{fontSize:18}}>{row.symbol}</span>
                          <span style={{fontWeight:600,color:T.text}}>{row.label}</span>
                        </div>
                      </td>
                      <td style={{padding:'16px',textAlign:'right',fontFamily:'monospace',fontSize:14,color:T.text2}}>{hasData ? fmt(rInv, 'INR') : '—'}</td>
                      <td style={{padding:'16px',textAlign:'right',fontFamily:'monospace',fontSize:14,fontWeight:700,color:T.text}}>{hasData ? fmt(rCur, 'INR') : '—'}</td>
                      <td style={{padding:'16px',textAlign:'right',fontFamily:'monospace',fontSize:14,fontWeight:700,color:gain>=0?T.success:T.danger}}>{hasData ? `${gain>=0?'+':'−'}₹${Math.abs(gain).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '—'}</td>
                      <td style={{padding:'16px',textAlign:'right',fontFamily:'monospace',fontSize:14,fontWeight:700,color:gain>=0?T.success:T.danger}}>{hasData ? `${pct>=0?'+':''}${pct.toFixed(2)}%` : '—'}</td>
                    </tr>
                  );
                })}
                <tr style={{background:T.surface3,fontWeight:800}}>
                  <td style={{padding:'16px',fontSize:14,color:T.text}}>Total Portfolio</td>
                  <td style={{padding:'16px',textAlign:'right',fontSize:15,color:T.text2}}>{fmt(latest.inrInv,'INR')}</td>
                  <td style={{padding:'16px',textAlign:'right',fontSize:15,color:T.accent}}>{fmt(latest.inrVal,'INR')}</td>
                  <td style={{padding:'16px',textAlign:'right',fontSize:15,color:gain>=0?T.success:T.danger}}>{gain>=0?'+':'−'}₹{Math.abs(gain).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                  <td style={{padding:'16px',textAlign:'right',fontSize:15,color:gain>=0?T.success:T.danger}}>{gainPct>=0?'+':''}{gainPct.toFixed(2)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{background:T.surface2,borderRadius:12,border:`1px solid ${T.border}`,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,0.1)'}}>
          <div style={{padding:'16px 20px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:8}}>
            <Ic.LineChart size={16} color={T.text2}/>
            <span style={{fontSize:14,fontWeight:700,color:T.text}}>Historical Daily Performance Log</span>
          </div>
          <div style={{overflowX:'auto',maxHeight:450,overflowY:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead style={{position:'sticky',top:0,zIndex:2}}>
                <tr style={{background:T.surface3}}>
                  {['Date','Total Value (₹)','Day Chg (₹)','Indian Equity','US Equity','NPS','Gold'].map(h=><th key={h} style={{padding:'12px 16px',textAlign:'right',color:T.text3,fontWeight:700,fontSize:10,textTransform:'uppercase',borderBottom:`1px solid ${T.border}`}}>{h}</th>)}
                </tr>
              </thead>
              <tbody>{[...data].reverse().map((d,i)=>{
                const prev=data[data.length-2-i];
                const curPnl = d.inrVal - (d.inrInv || 0);
                const prevPnl = prev ? (prev.inrVal - (prev.inrInv || 0)) : null;
                const inrChg = prevPnl != null ? curPnl - prevPnl : null;
                const inInrVal = d.inrEquityVal || (d.portfolioVal - (Math.round((d.usdVal||0)*(d.usdInr||83.5))));
                const usInrVal = (d.usdEquityVal > 0 ? Math.round(d.usdEquityVal * (d.usdInr || 83.5)) : 0) || Math.round((d.usdVal||0)*(d.usdInr||83.5));
                return(
                  <tr key={d.date} style={{background:i%2===0?T.surface2:T.surface3}} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface2:T.surface3}>
                    <td style={{padding:'12px 16px',textAlign:'left',borderBottom:`1px solid ${T.border}`,color:T.text,fontWeight:600}}>{new Date(d.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                    <td style={{padding:'12px 16px',textAlign:'right',borderBottom:`1px solid ${T.border}`,fontWeight:700,color:T.cyan}}>₹{d.inrVal.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                    <td style={{padding:'12px 16px',textAlign:'right',borderBottom:`1px solid ${T.border}`}}>{inrChg!=null?<span style={{fontWeight:700,color:inrChg>=0?T.success:T.danger}}>{inrChg>=0?'+':'−'}₹{Math.abs(inrChg).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>:'—'}</td>
                    <td style={{padding:'12px 16px',textAlign:'right',borderBottom:`1px solid ${T.border}`,color:T.text2}}>{inInrVal > 0 ? `₹${inInrVal.toLocaleString('en-IN',{maximumFractionDigits:0})}` : '—'}</td>
                    <td style={{padding:'12px 16px',textAlign:'right',borderBottom:`1px solid ${T.border}`,color:T.text2}}>{usInrVal > 0 ? `₹${usInrVal.toLocaleString('en-IN',{maximumFractionDigits:0})}` : '—'}</td>
                    <td style={{padding:'12px 16px',textAlign:'right',borderBottom:`1px solid ${T.border}`,color:T.text2}}>{d.npsVal > 0 ? `₹${d.npsVal.toLocaleString('en-IN',{maximumFractionDigits:0})}` : '—'}</td>
                    <td style={{padding:'12px 16px',textAlign:'right',borderBottom:`1px solid ${T.border}`,color:T.text2}}>{d.goldVal > 0 ? `₹${d.goldVal.toLocaleString('en-IN',{maximumFractionDigits:0})}` : '—'}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: WATCHLIST ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export function WatchlistModule({T,usdInr,onClose}) {
  const [items,setItems]=useState(()=>{try{return JSON.parse(getItemSync('pm_watchlist')||'[]');}catch{return [];}});
  const [wPrices,setWPrices]=useState({});
  const [wLoading,setWLoading]=useState(false);
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({symbol:'',name:'',targetEntry:'',targetExit:'',notes:''});
  const {srch,setSrch,results,setResults,focused,setFocused,busyS,doSearch,clearSearch}=useYahooSearch();
  const [editId,setEditId]=useState(null);

  useEffect(()=>{setItemSync('pm_watchlist',JSON.stringify(items));},[items]);

  const fetchWPrices=useCallback(async()=>{
    if(!items.length)return;
    setWLoading(true);
    const out={};
    await Promise.all(items.map(async item=>{
      try{
        const r=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.symbol)}?interval=1d&range=1d`,{headers:{Accept:'application/json'}});
        if(!r.ok)throw new Error();
        const j=await r.json();
        const meta=j?.chart?.result?.[0]?.meta;
        if(meta?.regularMarketPrice) out[item.symbol]={cur:meta.regularMarketPrice,prev:meta.chartPreviousClose??meta.regularMarketPrice,currency:meta.currency??(isUS(item.symbol)?'USD':'INR')};
      }catch{}
    }));
    setWPrices(out);setWLoading(false);
  },[items]);

  useEffect(()=>{fetchWPrices();},[fetchWPrices]);

  // doSearch: provided by useYahooSearch hook

  const addItem=()=>{
    const sym=form.symbol.trim().toUpperCase();if(!sym)return;
    if(items.find(i=>i.symbol===sym)){alert('Already in watchlist');return;}
    setItems(p=>[{id:Date.now(),symbol:sym,name:form.name||sym,targetEntry:parseFloat(form.targetEntry)||null,targetExit:parseFloat(form.targetExit)||null,notes:form.notes,addedDate:Date.now()},...p]);
    setForm({symbol:'',name:'',targetEntry:'',targetExit:'',notes:''});setSrch('');setResults([]);setShowAdd(false);
  };

  const removeItem=id=>{
    if(window.confirm("Remove this stock from your watchlist?")){
      setItems(p=>p.filter(i=>i.id!==id));
    }
  };
  const saveEdit=item=>setItems(p=>p.map(i=>i.id===item.id?item:i));

  const csvExport=()=>{
    const h=['Symbol','Name','Added','Target Entry','Target Exit','Current Price','Chg%','From Entry%','Notes'];
    const body=items.map(i=>{const p=wPrices[i.symbol];const cur=p?.cur;const chg=p?((p.cur-p.prev)/p.prev)*100:null;const fromEntry=cur&&i.targetEntry?((cur-i.targetEntry)/i.targetEntry)*100:null;return[i.symbol,i.name,new Date(i.addedDate).toLocaleDateString('en-IN'),i.targetEntry??'',i.targetExit??'',cur?.toFixed(2)??'',chg?.toFixed(2)??'',fromEntry?.toFixed(2)??'',i.notes??''];});
    const csv=[h,...body].map(r=>r.join(',')).join('\n');
    const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:`watchlist_${new Date().toISOString().slice(0,10)}.csv`});a.click();
  };

  const INP={padding:'8px 12px',background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:6,color:T.text,fontSize:12,outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit'};
  const tdS={padding:'10px 14px',borderBottom:`1px solid ${T.border}`,fontSize:12,whiteSpace:'nowrap'};

  return(
    <div style={{flex:1,overflowY:'auto',minHeight:0}}>
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Watchlist</div>
          <div style={{fontSize:13,color:T.text3}}>{items.length} stock{items.length!==1?'s':''} tracked</div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div style={{display:'flex',gap:8}}>
            <NvBtn onClick={csvExport} T={T} disabled={!items.length}><Ic.Download/> Export</NvBtn>
            <NvBtn onClick={fetchWPrices} disabled={wLoading} T={T}><Ic.Refresh s={wLoading}/> Refresh</NvBtn>
            <NvBtn onClick={()=>setShowAdd(v=>!v)} variant="primary" T={T}><Ic.Plus/> Add Stock</NvBtn>
          </div>
          {onClose&&<button onClick={onClose} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:6,cursor:'pointer',color:T.text3,padding:'7px 8px',display:'flex',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}><Ic.X/></button>}
        </div>
      </div>

      {/* Add form */}
      {showAdd&&(
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:18}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:14}}>Add to Watchlist</div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:10,marginBottom:12}}>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Search Stock</div>
              <div style={{position:'relative'}}>
                <input value={srch} onChange={e=>doSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),200)} placeholder="e.g. INFY, AAPL…" style={INP} autoFocus/>
                {busyS&&<span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:T.text3,fontSize:11}}>…</span>}
                {focused&&results.length>0&&(
                  <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,zIndex:9999,background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:8,boxShadow:'0 8px 24px rgba(0,0,0,.3)',overflow:'hidden'}}>
                    {results.map((r,i)=>(
                      <div key={r.symbol} onMouseDown={()=>{setForm(p=>({...p,symbol:r.symbol,name:r.longname||r.shortname||r.symbol}));setSrch(r.longname||r.shortname||r.symbol);setResults([]);}} style={{padding:'9px 14px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:i<results.length-1?`1px solid ${T.border}`:'none',transition:'background .08s'}} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <div><span style={{fontWeight:700,color:T.accent,marginRight:8}}>{r.symbol}</span><span style={{fontSize:11,color:T.text3}}>{r.longname||r.shortname}</span></div>
                        {r.exchDisp&&<span style={{fontSize:10,color:T.text3}}>{r.exchDisp}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {form.symbol&&<div style={{fontSize:11,color:T.accent,marginTop:4}}>✓ {form.symbol} — {form.name}</div>}
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Target Entry</div>
              <input type="number" value={form.targetEntry} onChange={e=>setForm(p=>({...p,targetEntry:e.target.value}))} placeholder="Buy at…" style={INP}/>
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Target Exit</div>
              <input type="number" value={form.targetExit} onChange={e=>setForm(p=>({...p,targetExit:e.target.value}))} placeholder="Sell at…" style={INP}/>
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Notes</div>
              <input value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Rationale…" style={INP}/>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <NvBtn onClick={addItem} variant="primary" disabled={!form.symbol} T={T}><Ic.Plus/> Add</NvBtn>
            <NvBtn onClick={()=>{setShowAdd(false);setSrch('');setResults([]);setForm({symbol:'',name:'',targetEntry:'',targetExit:'',notes:''});}} T={T}><Ic.X/></NvBtn>
          </div>
        </div>
      )}

      {/* Table */}
      {!items.length&&<div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:40,textAlign:'center',color:T.text3}}>No stocks in watchlist. Click Add Stock to start tracking.</div>}
      {items.length>0&&(
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:T.surface3}}>
                {['Symbol','Added','Current','Day %','Target Entry','Vs Entry','Target Exit','Vs Exit','Notes',''].map(h=>(
                  <th key={h} style={{...tdS,color:T.text3,fontWeight:700,fontSize:11,textAlign:h===''?'center':'left'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {items.map((item,i)=>{
                  const p=wPrices[item.symbol];
                  const cur=p?.cur??null;
                  const currency=p?.currency??(isUS(item.symbol)?'USD':'INR');
                  const dayChg=p?((p.cur-p.prev)/p.prev)*100:null;
                  const vsEntry=cur&&item.targetEntry?((cur-item.targetEntry)/item.targetEntry)*100:null;
                  const vsExit=cur&&item.targetExit?((cur-item.targetExit)/item.targetExit)*100:null;
                  const nearEntry=vsEntry!=null&&Math.abs(vsEntry)<5;
                  const hitExit=vsExit!=null&&vsExit>=0;
                  const isEdit=editId===item.id;
                  return(
                    <tr key={item.id} style={{background:hitExit?T.successBg:nearEntry?T.warnBg:i%2===0?T.surface2:T.surface3}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.surface4}
                      onMouseLeave={e=>e.currentTarget.style.background=hitExit?T.successBg:nearEntry?T.warnBg:i%2===0?T.surface2:T.surface3}>
                      <td style={{...tdS}}>
                        <div style={{fontWeight:700,color:T.accent}}>{short(item.symbol)}</div>
                        <div style={{fontSize:10,color:T.text3,maxWidth:110,overflow:'hidden',textOverflow:'ellipsis'}}>{item.name}</div>
                        {hitExit&&<span style={{fontSize:9,background:T.success,color:'#000',padding:'1px 5px',borderRadius:3,fontWeight:700}}>TARGET HIT</span>}
                        {nearEntry&&!hitExit&&<span style={{fontSize:9,background:T.warning,color:'#000',padding:'1px 5px',borderRadius:3,fontWeight:700}}>NEAR ENTRY</span>}
                      </td>
                      <td style={{...tdS,color:T.text3,fontSize:11}}>{new Date(item.addedDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})}</td>
                      <td style={{...tdS,fontWeight:700,color:T.cyan}}>
                        {cur!=null?fmt(cur,currency):<span style={{color:T.text3,animation:'pulse 2s infinite'}}>Live…</span>}
                        {cur!=null&&currency==='USD'&&usdInr&&<div style={{fontSize:9,color:T.text3}}>≈ ₹{(cur*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}</div>}
                      </td>
                      <td style={{...tdS}}>
                        {dayChg!=null?<span style={{fontWeight:700,color:dayChg>=0?T.success:T.danger}}>{dayChg>=0?'+':''}{dayChg.toFixed(2)}%</span>:<span style={{color:T.text3}}>—</span>}
                      </td>
                      <td style={{...tdS,color:T.text2}}>{item.targetEntry?fmt(item.targetEntry,currency):'—'}</td>
                      <td style={{...tdS}}>
                        {vsEntry!=null?<span style={{fontWeight:700,color:vsEntry<=0?T.success:T.warning}}>{vsEntry>=0?'+':''}{vsEntry.toFixed(1)}%</span>:<span style={{color:T.text3}}>—</span>}
                      </td>
                      <td style={{...tdS,color:T.text2}}>{item.targetExit?fmt(item.targetExit,currency):'—'}</td>
                      <td style={{...tdS}}>
                        {vsExit!=null?<span style={{fontWeight:700,color:vsExit>=0?T.success:T.danger}}>{vsExit>=0?'+':''}{vsExit.toFixed(1)}%</span>:<span style={{color:T.text3}}>—</span>}
                      </td>
                      <td style={{...tdS,color:T.text3,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis'}}>{item.notes||'—'}</td>
                      <td style={{...tdS,textAlign:'center'}}>
                        <button onClick={()=>removeItem(item.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:'3px 6px',borderRadius:4,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.color=T.danger;e.currentTarget.style.background=T.dangerBg;}} onMouseLeave={e=>{e.currentTarget.style.color=T.text3;e.currentTarget.style.background='none';}} title="Remove"><Ic.Trash/></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: BUY LOTS TRACKER ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export function LotsModule({T,prices,onClose}) {
  const [lots,setLots]=useState(()=>{try{return JSON.parse(getItemSync('pm_lots')||'[]');}catch{return [];}});
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({symbol:'',name:'',qty:'',buyPrice:'',buyDate:new Date().toISOString().slice(0,10),currency:'INR',notes:''});
  const {srch,setSrch,results,setResults,focused,setFocused,busyS,doSearch,clearSearch}=useYahooSearch();
  const [filter,setFilter]=useState('');

  useEffect(()=>{setItemSync('pm_lots',JSON.stringify(lots));},[lots]);

  // doSearch: provided by useYahooSearch hook

  const addLot=()=>{
    const sym=form.symbol.trim().toUpperCase();
    if(!sym||!form.qty||!form.buyPrice||!form.buyDate)return;
    setLots(p=>[{id:Date.now(),symbol:sym,name:form.name||sym,qty:parseFloat(form.qty),buyPrice:parseFloat(form.buyPrice),buyDate:form.buyDate,currency:form.currency,notes:form.notes},...p]);
    setForm(f=>({...f,symbol:'',name:'',qty:'',buyPrice:'',notes:''}));setSrch('');setResults([]);setShowAdd(false);
  };
  const removeLot=id=>setLots(p=>p.filter(l=>l.id!==id));

  // Group lots by symbol, compute weighted avg
  const grouped=useMemo(()=>{
    const map={};
    lots.filter(l=>!filter||l.symbol.includes(filter.toUpperCase())||l.name.toLowerCase().includes(filter.toLowerCase())).forEach(l=>{
      if(!map[l.symbol])map[l.symbol]={symbol:l.symbol,name:l.name,currency:l.currency,lots:[],totalQty:0,totalInvested:0};
      const g=map[l.symbol];
      g.lots.push(l);g.totalQty+=l.qty;g.totalInvested+=l.qty*l.buyPrice;
    });
    return Object.values(map).map(g=>({...g,avgBuy:g.totalInvested/g.totalQty})).sort((a,b)=>a.symbol.localeCompare(b.symbol));
  },[lots,filter]);

  const curPrice=sym=>{const p=prices[sym];return p?.current??null;};

  const csvExport=()=>{
    const h=['Symbol','Name','Lot Date','Qty','Buy Price','Invested','Current Price','Current Value','P&L','P&L%','Holding Days','Notes'];
    const body=lots.map(l=>{const cp=curPrice(l.symbol);const invested=l.qty*l.buyPrice;const curVal=cp?cp*l.qty:null;const pnl=curVal?curVal-invested:null;const pnlPct=pnl&&invested?pnl/invested*100:null;const days=Math.floor((Date.now()-new Date(l.buyDate))/86400000);return[l.symbol,l.name,l.buyDate,l.qty,l.buyPrice,invested.toFixed(2),cp?.toFixed(2)??'',curVal?.toFixed(2)??'',pnl?.toFixed(2)??'',pnlPct?.toFixed(2)??'',days,l.notes??''];});
    const csv=[h,...body].map(r=>r.join(',')).join('\n');
    const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:`lots_${new Date().toISOString().slice(0,10)}.csv`});a.click();
  };

  const INP={padding:'8px 12px',background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:6,color:T.text,fontSize:12,outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit'};
  const tdS={padding:'9px 12px',borderBottom:`1px solid ${T.border}`,fontSize:12,whiteSpace:'nowrap'};

  return(
    <div style={{flex:1,overflowY:'auto',minHeight:0}}>
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Buy Lots Tracker</div>
          <div style={{fontSize:13,color:T.text3}}>{lots.length} lot{lots.length!==1?'s':''} across {grouped.length} stock{grouped.length!==1?'s':''}</div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={{position:'relative'}}><span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:T.text3,pointerEvents:'none'}}><Ic.Search/></span><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter…" style={{...INP,width:140,paddingLeft:30}}/></div>
            <NvBtn onClick={csvExport} T={T} disabled={!lots.length}><Ic.Download/> Export</NvBtn>
            <NvBtn onClick={()=>setShowAdd(v=>!v)} variant="primary" T={T}><Ic.Plus/> Add Lot</NvBtn>
          </div>
          {onClose&&<button onClick={onClose} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:6,cursor:'pointer',color:T.text3,padding:'7px 8px',display:'flex',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}><Ic.X/></button>}
        </div>
      </div>

      {/* Add form */}
      {showAdd&&(
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:18}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:14}}>Record Buy Transaction</div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 0.7fr 0.8fr 0.8fr 0.6fr auto',gap:10,alignItems:'end'}}>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Stock</div>
              <div style={{position:'relative'}}>
                <input value={srch} onChange={e=>doSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),200)} placeholder="Search stock…" style={INP} autoFocus/>
                {focused&&results.length>0&&(
                  <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,zIndex:9999,background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:8,boxShadow:'0 8px 24px rgba(0,0,0,.3)',overflow:'hidden'}}>
                    {results.map((r,i)=>(
                      <div key={r.symbol} onMouseDown={()=>{setForm(p=>({...p,symbol:r.symbol,name:r.longname||r.shortname||r.symbol,currency:isUS(r.symbol)?'USD':'INR'}));setSrch(r.longname||r.shortname||r.symbol);setResults([]);}} style={{padding:'9px 14px',cursor:'pointer',display:'flex',justifyContent:'space-between',borderBottom:i<results.length-1?`1px solid ${T.border}`:'none',transition:'background .08s'}} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <div><span style={{fontWeight:700,color:T.accent,marginRight:8}}>{r.symbol}</span><span style={{fontSize:11,color:T.text3}}>{r.longname||r.shortname}</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {form.symbol&&<div style={{fontSize:11,color:T.accent,marginTop:3}}>✓ {form.symbol}</div>}
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Qty</div>
              <input type="number" value={form.qty} onChange={e=>setForm(p=>({...p,qty:e.target.value}))} placeholder="10" style={INP}/>
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Buy Price</div>
              <input type="number" value={form.buyPrice} onChange={e=>setForm(p=>({...p,buyPrice:e.target.value}))} placeholder="2800" style={INP}/>
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Buy Date</div>
              <input type="date" value={form.buyDate} onChange={e=>setForm(p=>({...p,buyDate:e.target.value}))} style={INP}/>
            </div>
            <div>
              <div style={{fontSize:11,color:T.text3,fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Notes</div>
              <input value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Optional" style={INP}/>
            </div>
            <div style={{display:'flex',gap:6}}>
              <NvBtn onClick={addLot} variant="primary" disabled={!form.symbol||!form.qty||!form.buyPrice} T={T}><Ic.Plus/> Add</NvBtn>
              <NvBtn onClick={()=>{setShowAdd(false);setSrch('');setResults([]);}} T={T}><Ic.X/></NvBtn>
            </div>
          </div>
        </div>
      )}

      {!lots.length&&<div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:40,textAlign:'center',color:T.text3}}>No lots recorded yet. Add individual buy transactions to track weighted average cost.</div>}

      {/* Grouped by stock */}
      {grouped.map(g=>{
        const cp=curPrice(g.symbol);
        const curVal=cp?cp*g.totalQty:null;
        const pnl=curVal?curVal-g.totalInvested:null;
        const pnlPct=pnl?pnl/g.totalInvested*100:null;
        return(
          <div key={g.symbol} style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden'}}>
            {/* Stock header */}
            <div style={{padding:'12px 16px',background:T.surface3,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontWeight:700,color:T.accent,fontSize:14}}>{short(g.symbol)}</span>
                <span style={{fontSize:12,color:T.text3}}>{g.name}</span>
                <span style={{fontSize:11,color:T.text3,background:T.surface4,padding:'2px 8px',borderRadius:10}}>{g.lots.length} lot{g.lots.length!==1?'s':''}</span>
              </div>
              <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
                <div style={{textAlign:'right'}}><div style={{fontSize:10,color:T.text3,marginBottom:2}}>Total Qty</div><div style={{fontWeight:700,color:T.text}}>{g.totalQty}</div></div>
                <div style={{textAlign:'right'}}><div style={{fontSize:10,color:T.text3,marginBottom:2}}>Avg Buy</div><div style={{fontWeight:700,color:T.text}}>{fmt(g.avgBuy,g.currency)}</div></div>
                <div style={{textAlign:'right'}}><div style={{fontSize:10,color:T.text3,marginBottom:2}}>Invested</div><div style={{fontWeight:700,color:T.text}}>{fmt(g.totalInvested,g.currency)}</div></div>
                {cp&&<div style={{textAlign:'right'}}><div style={{fontSize:10,color:T.text3,marginBottom:2}}>Current</div><div style={{fontWeight:700,color:T.cyan}}>{fmt(cp,g.currency)}</div></div>}
                {pnl!=null&&<div style={{textAlign:'right'}}><div style={{fontSize:10,color:T.text3,marginBottom:2}}>P&L</div><div style={{fontWeight:700,color:pnl>=0?T.success:T.danger}}>{pnl>=0?'+':'−'}{fmt(Math.abs(pnl),g.currency)} ({pnlPct?.toFixed(1)}%)</div></div>}
              </div>
            </div>
            {/* Individual lots */}
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:T.surface4}}>
                {['Buy Date','Qty','Buy Price','Invested','Current Value','P&L','P&L %','Days Held','Notes',''].map(h=>(
                  <th key={h} style={{...tdS,color:T.text3,fontWeight:600,fontSize:10}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {g.lots.map((lot,i)=>{
                  const cp2=curPrice(lot.symbol);
                  const inv=lot.qty*lot.buyPrice;
                  const cv=cp2?cp2*lot.qty:null;
                  const pnl2=cv?cv-inv:null;
                  const pnlP=pnl2?pnl2/inv*100:null;
                  const days=Math.floor((Date.now()-new Date(lot.buyDate))/86400000);
                  return(
                    <tr key={lot.id} style={{background:i%2===0?T.surface2:T.surface3}} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface2:T.surface3}>
                      <td style={{...tdS,color:T.text}}>{new Date(lot.buyDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                      <td style={{...tdS,color:T.text2}}>{lot.qty}</td>
                      <td style={{...tdS,color:T.text2}}>{fmt(lot.buyPrice,lot.currency)}</td>
                      <td style={{...tdS,color:T.text}}>{fmt(inv,lot.currency)}</td>
                      <td style={{...tdS,color:T.cyan}}>{cv?fmt(cv,lot.currency):'—'}</td>
                      <td style={{...tdS}}>{pnl2!=null?<span style={{fontWeight:700,color:pnl2>=0?T.success:T.danger}}>{pnl2>=0?'+':'−'}{fmt(Math.abs(pnl2),lot.currency)}</span>:'—'}</td>
                      <td style={{...tdS}}>{pnlP!=null?<span style={{fontWeight:700,color:pnlP>=0?T.success:T.danger}}>{pnlP>=0?'+':''}{pnlP.toFixed(2)}%</span>:'—'}</td>
                      <td style={{...tdS,color:days>=365?T.success:T.warning}}><span style={{fontWeight:600}}>{days}d</span><span style={{fontSize:10,marginLeft:4,color:T.text3}}>{days>=365?'LTCG':'STCG'}</span></td>
                      <td style={{...tdS,color:T.text3}}>{lot.notes||'—'}</td>
                      <td style={{...tdS,textAlign:'center'}}><button onClick={()=>{if(window.confirm("Delete this buy lot? This will affect your average price calculations.")) removeLot(lot.id);}} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:'3px 6px',borderRadius:4,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.color=T.danger;}} onMouseLeave={e=>{e.currentTarget.style.color=T.text3;}}><Ic.Trash/></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: TAX P&L (STCG / LTCG) ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export function TaxModule({T,prices,onClose}) {
  const [lots,setLots]=useState(()=>{try{return JSON.parse(getItemSync('pm_lots')||'[]');}catch{return [];}});
  const [soldLots,setSoldLots]=useState(()=>{try{return JSON.parse(getItemSync('pm_sold_lots')||'[]');}catch{return [];}});
  const [showSell,setShowSell]=useState(null); // lot id
  const [sellForm,setSellForm]=useState({sellPrice:'',sellDate:new Date().toISOString().slice(0,10),qty:''});
  const FY_START=new Date('2025-04-01').getTime();
  const FY_END=new Date('2026-03-31').getTime();

  useEffect(()=>{setItemSync('pm_sold_lots',JSON.stringify(soldLots));},[soldLots]);

  const recordSale=(lotId)=>{
    const lot=lots.find(l=>l.id===lotId);if(!lot)return;
    const sellQty=parseFloat(sellForm.qty)||lot.qty;
    const sellPrice=parseFloat(sellForm.sellPrice);if(!sellPrice)return;
    const days=Math.floor((new Date(sellForm.sellDate)-new Date(lot.buyDate))/86400000);
    const isLTCG=days>=365;
    const gain=(sellPrice-lot.buyPrice)*sellQty;
    const taxRate=lot.currency==='INR'?(isLTCG?0.10:0.15):(isLTCG?0.20:0.30);
    const taxable=isLTCG&&lot.currency==='INR'?Math.max(0,gain-100000):gain;
    const tax=Math.max(0,taxable*taxRate);
    setSoldLots(p=>[{id:Date.now(),symbol:lot.symbol,name:lot.name,currency:lot.currency,buyPrice:lot.buyPrice,buyDate:lot.buyDate,sellPrice,sellDate:sellForm.sellDate,qty:sellQty,gain,isLTCG,days,tax,taxRate},...p]);
    if(sellQty>=lot.qty)setLots(p=>p.filter(l=>l.id!==lotId));
    else setLots(p=>p.map(l=>l.id===lotId?{...l,qty:l.qty-sellQty}:l));
    setShowSell(null);setSellForm({sellPrice:'',sellDate:new Date().toISOString().slice(0,10),qty:''});
  };

  // Unrealized gains from open lots
  const unrealized=useMemo(()=>lots.map(l=>{
    const p=prices[l.symbol];const cp=p?.current??null;if(!cp)return null;
    const days=Math.floor((Date.now()-new Date(l.buyDate))/86400000);
    const isLTCG=days>=365;const gain=(cp-l.buyPrice)*l.qty;
    const taxRate=l.currency==='INR'?(isLTCG?0.10:0.15):(isLTCG?0.20:0.30);
    const taxable=isLTCG&&l.currency==='INR'?Math.max(0,gain-100000):gain;
    const tax=Math.max(0,taxable*taxRate);
    return{...l,cp,days,isLTCG,gain,tax,taxRate};
  }).filter(Boolean),[lots,prices]);

  const fyRealized=soldLots.filter(s=>new Date(s.sellDate).getTime()>=FY_START&&new Date(s.sellDate).getTime()<=FY_END);
  const stcgRealized=fyRealized.filter(s=>!s.isLTCG).reduce((a,s)=>a+s.gain,0);
  const ltcgRealized=fyRealized.filter(s=>s.isLTCG).reduce((a,s)=>a+s.gain,0);
  const taxRealized=fyRealized.reduce((a,s)=>a+s.tax,0);
  const stcgUnrealized=unrealized.filter(u=>!u.isLTCG).reduce((a,u)=>a+u.gain,0);
  const ltcgUnrealized=unrealized.filter(u=>u.isLTCG).reduce((a,u)=>a+u.gain,0);
  const taxUnrealized=unrealized.reduce((a,u)=>a+u.tax,0);

  const csvExport=()=>{
    const h=['Symbol','Buy Date','Sell Date','Qty','Buy Price','Sell Price','Gain/Loss','Type','Days','Tax Rate','Est. Tax'];
    const body=soldLots.map(s=>[s.symbol,s.buyDate,s.sellDate,s.qty,s.buyPrice,s.sellPrice,s.gain.toFixed(2),s.isLTCG?'LTCG':'STCG',s.days,`${(s.taxRate*100).toFixed(0)}%`,s.tax.toFixed(2)]);
    const csv=[h,...body].map(r=>r.join(',')).join('\n');
    const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:`tax_pnl_FY2025-26_${new Date().toISOString().slice(0,10)}.csv`});a.click();
  };

  const INP={padding:'8px 12px',background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:6,color:T.text,fontSize:12,outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit'};
  const tdS={padding:'9px 12px',borderBottom:`1px solid ${T.border}`,fontSize:12};
  const SumCard=({label,value,sub,vc})=>(
    <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:'14px 18px'}}>
      <div style={{fontSize:11,color:T.text3,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>{label}</div>
      <div style={{fontSize:18,fontWeight:700,color:vc||T.text}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:T.text3,marginTop:4}}>{sub}</div>}
    </div>
  );

  return(
    <div style={{flex:1,overflowY:'auto',minHeight:0}}>
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Tax P&L — FY 2025-26</div>
          <div style={{fontSize:13,color:T.text3}}>STCG 15% · LTCG 10% (above ₹1L) · Holding &lt; 12 months = STCG</div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <NvBtn onClick={csvExport} T={T} disabled={!soldLots.length}><Ic.Download/> Export FY 25-26</NvBtn>
          </div>
          {onClose&&<button onClick={onClose} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:6,cursor:'pointer',color:T.text3,padding:'7px 8px',display:'flex',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}><Ic.X/></button>}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
        <SumCard label="Realized STCG" value={`${stcgRealized>=0?'+':'−'}₹${Math.abs(stcgRealized).toLocaleString('en-IN',{maximumFractionDigits:0})}`} sub="Tax @ 15%" vc={stcgRealized>=0?T.success:T.danger}/>
        <SumCard label="Realized LTCG" value={`${ltcgRealized>=0?'+':'−'}₹${Math.abs(ltcgRealized).toLocaleString('en-IN',{maximumFractionDigits:0})}`} sub="Tax @ 10% (above ₹1L)" vc={ltcgRealized>=0?T.success:T.danger}/>
        <SumCard label="Total Tax Liability" value={`₹${taxRealized.toLocaleString('en-IN',{maximumFractionDigits:0})}`} sub={`${fyRealized.length} realized transactions`} vc={T.danger}/>
        <SumCard label="Unrealized STCG" value={`${stcgUnrealized>=0?'+':'−'}₹${Math.abs(stcgUnrealized).toLocaleString('en-IN',{maximumFractionDigits:0})}`} sub="If sold today" vc={stcgUnrealized>=0?T.warning:T.text3}/>
        <SumCard label="Unrealized LTCG" value={`${ltcgUnrealized>=0?'+':'−'}₹${Math.abs(ltcgUnrealized).toLocaleString('en-IN',{maximumFractionDigits:0})}`} sub="If sold today" vc={ltcgUnrealized>=0?T.success:T.text3}/>
        <SumCard label="Potential Tax (Unrealized)" value={`₹${taxUnrealized.toLocaleString('en-IN',{maximumFractionDigits:0})}`} sub="If all positions closed today" vc={T.warning}/>
      </div>

      {/* Open lots with sell option */}
      {lots.length>0&&(
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:3,height:16,background:T.accent,borderRadius:2}}/>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>Open Lots (from Lots Tracker)</span>
            <span style={{fontSize:11,color:T.text3,marginLeft:4}}>Record a sale to calculate tax</span>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:T.surface3}}>
                {['Symbol','Buy Date','Qty','Buy Price','Days Held','Type','Current P&L','Est. Tax',''].map(h=>(
                  <th key={h} style={{...tdS,color:T.text3,fontWeight:600,fontSize:10}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {lots.map((lot,i)=>{
                  const u=unrealized.find(u=>u.id===lot.id);
                  const days=Math.floor((Date.now()-new Date(lot.buyDate))/86400000);
                  const isLTCG=days>=365;
                  return(
                    <tr key={lot.id} style={{background:i%2===0?T.surface2:T.surface3}} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface2:T.surface3}>
                      <td style={{...tdS,fontWeight:700,color:T.accent}}>{short(lot.symbol)}</td>
                      <td style={{...tdS,color:T.text2}}>{new Date(lot.buyDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                      <td style={{...tdS,color:T.text}}>{lot.qty}</td>
                      <td style={{...tdS,color:T.text}}>{fmt(lot.buyPrice,lot.currency)}</td>
                      <td style={{...tdS,color:isLTCG?T.success:T.warning,fontWeight:600}}>{days}d</td>
                      <td style={{...tdS}}><span style={{padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700,background:isLTCG?T.successBg:T.warnBg,color:isLTCG?T.success:T.warning}}>{isLTCG?'LTCG':'STCG'}</span></td>
                      <td style={{...tdS}}>{u?<span style={{fontWeight:700,color:u.gain>=0?T.success:T.danger}}>{u.gain>=0?'+':'−'}₹{Math.abs(u.gain).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>:'—'}</td>
                      <td style={{...tdS,color:T.danger,fontWeight:600}}>{u?`₹${u.tax.toLocaleString('en-IN',{maximumFractionDigits:0})}`:'—'}</td>
                      <td style={{...tdS}}>
                        {showSell===lot.id?(
                          <div style={{display:'flex',gap:6,alignItems:'center'}}>
                            <input type="number" value={sellForm.sellPrice} onChange={e=>setSellForm(p=>({...p,sellPrice:e.target.value}))} placeholder="Sell price" style={{...INP,width:90}}/>
                            <input type="number" value={sellForm.qty} onChange={e=>setSellForm(p=>({...p,qty:e.target.value}))} placeholder={`Qty (max ${lot.qty})`} style={{...INP,width:90}}/>
                            <input type="date" value={sellForm.sellDate} onChange={e=>setSellForm(p=>({...p,sellDate:e.target.value}))} style={{...INP,width:120}}/>
                            <NvBtn onClick={()=>recordSale(lot.id)} variant="primary" disabled={!sellForm.sellPrice} T={T}>Record</NvBtn>
                            <NvBtn onClick={()=>setShowSell(null)} T={T}><Ic.X/></NvBtn>
                          </div>
                        ):(
                          <NvBtn onClick={()=>{setShowSell(lot.id);setSellForm({sellPrice:'',sellDate:new Date().toISOString().slice(0,10),qty:lot.qty});}} T={T}>Record Sale</NvBtn>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Realized transactions this FY */}
      {fyRealized.length>0&&(
        <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:3,height:16,background:T.success,borderRadius:2}}/>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>Realized Transactions — FY 2025-26</span>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:T.surface3}}>
                {['Symbol','Buy Date','Sell Date','Qty','Buy Price','Sell Price','Gain/Loss','Type','Days','Tax Rate','Est. Tax'].map(h=>(
                  <th key={h} style={{...tdS,color:T.text3,fontWeight:600,fontSize:10}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {fyRealized.map((s,i)=>(
                  <tr key={s.id} style={{background:i%2===0?T.surface2:T.surface3}} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface2:T.surface3}>
                    <td style={{...tdS,fontWeight:700,color:T.accent}}>{short(s.symbol)}</td>
                    <td style={{...tdS,color:T.text3}}>{new Date(s.buyDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})}</td>
                    <td style={{...tdS,color:T.text3}}>{new Date(s.sellDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})}</td>
                    <td style={{...tdS,color:T.text}}>{s.qty}</td>
                    <td style={{...tdS,color:T.text2}}>{fmt(s.buyPrice,s.currency)}</td>
                    <td style={{...tdS,color:T.text2}}>{fmt(s.sellPrice,s.currency)}</td>
                    <td style={{...tdS,fontWeight:700,color:s.gain>=0?T.success:T.danger}}>{s.gain>=0?'+':'−'}{fmt(Math.abs(s.gain),s.currency)}</td>
                    <td style={{...tdS}}><span style={{padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700,background:s.isLTCG?T.successBg:T.warnBg,color:s.isLTCG?T.success:T.warning}}>{s.isLTCG?'LTCG':'STCG'}</span></td>
                    <td style={{...tdS,color:T.text3}}>{s.days}d</td>
                    <td style={{...tdS,color:T.text3}}>{(s.taxRate*100).toFixed(0)}%</td>
                    <td style={{...tdS,fontWeight:700,color:T.danger}}>{fmt(s.tax,s.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!lots.length&&!soldLots.length&&<div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:40,textAlign:'center',color:T.text3}}>No lots recorded. Add buy transactions in the Lots Tracker to compute tax liability.</div>}
      <div style={{fontSize:11,color:T.text3,fontStyle:'italic',padding:'0 4px'}}>⚠ Estimates only. Tax rates: Equity STCG 15%, LTCG 10% (above ₹1L exemption). Consult a CA for ITR filing.</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: NPS (NATIONAL PENSION SYSTEM) ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function NPSModule({T,holdings,setHoldings,navs,setNavs,growth,setGrowth,onClose}) {
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({pfm:'SBI Pension Funds Pvt. Ltd.',e_u:'',c_u:'',g_u:'',e_p:38,c_p:24,g_p:38,tInv:'',tOut:'',nCont:'',sDate:new Date().toISOString().split('T')[0]});
  const [editingNav,setEditingNav]=useState(null); // {pfm, sch, val}
  const [loading,setLoading]=useState(false);

  useEffect(() => {
    setItemSync('pm_nps_navs', JSON.stringify(navs));
  }, [navs]);

  const PFMS=[
    'SBI Pension Funds Pvt. Ltd.',
    'LIC Pension Fund Ltd.',
    'UTI Retirement Solutions Ltd.',
    'HDFC Pension Management Co. Ltd.',
    'ICICI Prudential Pension Funds Mgmt Co. Ltd.',
    'Kotak Mahindra Pension Fund Ltd.',
    'Aditya Birla Sun Life Pension Mgmt Ltd.',
    'Tata Pension Management Ltd.',
    'Max Life Pension Fund Mgmt Ltd.',
    'Axis Pension Fund Management Ltd.'
  ];

  const fetchNavs=async()=>{
    setLoading(true);
    try{
      const utiMap = {
        'E': 'https://www.moneycontrol.com/nps/nav/uti-retirement-solutions-pension-fund-scheme-e-tier-i/SM002003',
        'C': 'https://www.moneycontrol.com/nps/nav/uti-retirement-solutions-pension-fund-scheme-c-tier-i/SM002004',
        'G': 'https://www.moneycontrol.com/nps/nav/uti-retirement-solutions-pension-fund-scheme-g-tier-i/SM002005'
      };
      const newNavs = {...navs};
      let changed = false;
      for(const sch of ['E','C','G']){
        const val = await window.electronAPI.scrapeMoneycontrol(utiMap[sch]);
        if(val && val > 0) {
          newNavs['UTI_'+sch] = val;
          changed = true;
        }
      }
      if(changed) setNavs(newNavs);
    }catch(e){console.error(e);}
    setLoading(false);
  };

  const addPfm=()=>{
    const id=Date.now().toString();
    const newHoldings=[...(holdings||[]), {
      id, 
      pfm:form.pfm, 
      e:parseFloat(form.e_u)||0, 
      c:parseFloat(form.c_u)||0, 
      g:parseFloat(form.g_u)||0,
      e_p:parseFloat(form.e_p)||0,
      c_p:parseFloat(form.c_p)||0,
      g_p:parseFloat(form.g_p)||0,
      tInv:parseFloat(form.tInv)||0,
      tOut:parseFloat(form.tOut)||0,
      nCont:parseInt(form.nCont)||0,
      sDate:form.sDate,
      monthly:''
    }];
    setHoldings(newHoldings);
    setShowAdd(false);
    setForm({pfm:'SBI Pension Funds Pvt. Ltd.',e_u:'',c_u:'',g_u:'',e_p:38,c_p:24,g_p:38,tInv:'',tOut:'',nCont:'',sDate:new Date().toISOString().split('T')[0]});
  };

  const invest=(id)=>{
    const h = (holdings||[]).find(x=>x.id===id);
    const amt = parseFloat(h.monthly)||0;
    if(amt<=0) return;
    
    const navE = navs[getNavKey(h.pfm,'E')]||0;
    const navC = navs[getNavKey(h.pfm,'C')]||0;
    const navG = navs[getNavKey(h.pfm,'G')]||0;
    
    if(navE<=0||navC<=0||navG<=0) {
      alert("Please ensure all NAVs are updated before investing.");
      return;
    }
    
    const newE = h.e + (amt * (h.e_p/100) / navE);
    const newC = h.c + (amt * (h.c_p/100) / navC);
    const newG = h.g + (amt * (h.g_p/100) / navG);
    
    setHoldings(holdings.map(x=>x.id===id?{...x, e:newE, c:newC, g:newG, tInv: (x.tInv||0)+amt, nCont:(x.nCont||0)+1, monthly:''}:x));
  };

  const removePfm=(id)=>{
    if(window.confirm("Are you sure you want to remove this Pension Fund Manager? All units and history for this PFM will be lost.")){
      setHoldings(holdings.filter(h=>h.id!==id));
    }
  };

  const getNavKey=(pfm,sch)=>pfm.split(' ')[0].toUpperCase() + '_' + sch;
  
  const saveNav=()=>{
    if(!editingNav) return;
    const key = getNavKey(editingNav.pfm, editingNav.sch);
    setNavs(p=>({...p, [key]: parseFloat(editingNav.val)||0}));
    setEditingNav(null);
  };

  const totalVal = (holdings||[]).reduce((acc,h)=>{
    return acc + (h.e * (navs[getNavKey(h.pfm,'E')]||0)) + (h.c * (navs[getNavKey(h.pfm,'C')]||0)) + (h.g * (navs[getNavKey(h.pfm,'G')]||0));
  },0);

  const totalInvested = (holdings||[]).reduce((a,h)=>a+(parseFloat(h.tInv)||0),0);
  const totalWithdrawals = (holdings||[]).reduce((a,h)=>a+(parseFloat(h.tOut)||0),0);
  const totalProfit = (totalVal - totalInvested) + totalWithdrawals;
  const absReturn = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  
  // Aggregate XIRR (Synthetic with Growth)
  let aggregateXirr = 0;
  if(totalInvested > 0){
    const cfs = [];
    (holdings||[]).forEach(h => {
       if(!h.tInv || !h.sDate) return;
       const start = new Date(h.sDate);
       const end = new Date();
       const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
       const count = h.nCont > 0 ? h.nCont : months;
       const gapMs = (end.getTime() - start.getTime()) / count;
       
       const totalInv = parseFloat(h.tInv);
       let weightSum = 0;
       for(let i=0; i<count; i++) weightSum += Math.pow(1 + (growth/100), Math.floor(i/12));
       const firstCont = totalInv / weightSum;

       for(let i=0; i<count; i++) {
         const date = start.getTime() + (gapMs * i);
         if(date > end.getTime()) break;
         const amt = firstCont * Math.pow(1 + (growth/100), Math.floor(i/12));
         cfs.push({date, amount: -amt});
       }
       if(h.tOut > 0) cfs.push({date: end.getTime() - 1000, amount: parseFloat(h.tOut)});
    });
    cfs.push({date: new Date().getTime(), amount: totalVal});
    aggregateXirr = xirr(cfs);
  }

  const INP={padding:'10px 14px',background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:8,color:T.text,fontSize:13,outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit',transition:'border-color .15s'};
  const tdS={padding:'14px 18px',borderBottom:`1px solid ${T.border}`,textAlign:'left',whiteSpace:'nowrap'};

  const NavCell = ({h, sch, units}) => {
    const key = getNavKey(h.pfm, sch);
    const nav = navs[key] || 0;
    const val = units * nav;
    const isEditing = editingNav?.pfm === h.pfm && editingNav?.sch === sch;

    return (
      <td style={tdS}>
        <div style={{display:'flex', flexDirection:'column', gap:2}}>
          <div style={{fontSize:13, fontWeight:600, color:T.text}}>{fmt(val,'INR')}</div>
          <div style={{display:'flex', alignItems:'center', gap:4}}>
            <span style={{fontSize:10, color:T.text3}}>{fmtQty(units)} @</span>
            {isEditing ? (
              <div style={{display:'flex', gap:4}}>
                <input type="number" step="0.0001" value={editingNav.val} onChange={e=>setEditingNav(p=>({...p, val:e.target.value}))} style={{...INP, padding:'2px 4px', width:70, fontSize:10}} autoFocus onBlur={saveNav} onKeyDown={e=>e.key==='Enter'&&saveNav()}/>
              </div>
            ) : (
              <span onClick={()=>setEditingNav({pfm:h.pfm, sch, val:nav})} style={{fontSize:10, color:T.accent, cursor:'pointer', borderBottom:`1px dotted ${T.accent}`}}>{nav.toFixed(4)}</span>
            )}
          </div>
        </div>
      </td>
    );
  };

  return(
    <div style={{flex:1,overflowY:'auto',minHeight:0,background:T.surface}}>
      <div style={{padding:24,maxWidth:1200,margin:'0 auto',display:'flex',flexDirection:'column',gap:24}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:20}}>
          <div>
            <div style={{fontSize:24,fontWeight:800,color:T.text,letterSpacing:'-0.02em',marginBottom:4}}>NPS Portfolio</div>
            <div style={{fontSize:14,color:T.text3}}>National Pension System Tracking</div>
          </div>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <div style={{display:'flex', alignItems:'center', gap:8, background:T.surface2, border:`1px solid ${T.border}`, borderRadius:8, padding:'4px 12px'}}>
              <span style={{fontSize:11, fontWeight:700, color:T.text3, textTransform:'uppercase'}}>Step-up %</span>
              <input type="number" value={growth} onChange={e=>setGrowth(parseFloat(e.target.value)||0)} style={{...INP, padding:'4px 8px', width:50, border:'none', background:'none', fontSize:12}} title="Calibration: Tune this to match your NPS Portal XIRR"/>
            </div>
            <NvBtn onClick={fetchNavs} T={T} disabled={loading}><Ic.Refresh s={loading}/> Sync Latest NAVs</NvBtn>
            <NvBtn onClick={()=>setShowAdd(!showAdd)} variant="primary" T={T}><Ic.Plus/> Add Fund Manager</NvBtn>
            {onClose&&<button onClick={onClose} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,cursor:'pointer',color:T.text3,padding:'8px',display:'flex'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}><Ic.X/></button>}
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16}}>
          {[
            {l:'Total Invested', v:fmt(totalInvested,'INR'), c:T.text},
            {l:'Total Profit (Gain)', v:fmt(totalProfit,'INR'), c:totalProfit>=0?T.success:T.danger},
            {l:'Absolute Return', v:absReturn.toFixed(2)+'%', c:absReturn>=0?T.success:T.danger},
            {l:'XIRR (Annualized)', v:aggregateXirr.toFixed(2)+'%', c:aggregateXirr>=0?T.success:T.danger}
          ].map((m,i)=>(
            <div key={i} style={{background:T.surface2,border:`1px solid ${T.border}`,borderRadius:12,padding:'16px 20px',display:'flex',flexDirection:'column',gap:4}}>
              <div style={{fontSize:11,color:T.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em'}}>{m.l}</div>
              <div style={{fontSize:22,fontWeight:800,color:m.c}}>{m.v}</div>
            </div>
          ))}
        </div>

        {showAdd&&(
          <div style={{background:T.surface2,border:`1px solid ${T.border}`,borderRadius:12,padding:24,display:'flex',flexDirection:'column',gap:20,boxShadow:'0 12px 32px rgba(0,0,0,.2)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:15,fontWeight:700,color:T.text}}>Register New Fund Manager</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16}}>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <label style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase'}}>Pension Fund Manager</label>
                <select value={form.pfm} onChange={e=>setForm(p=>({...p,pfm:e.target.value}))} style={{...INP,cursor:'pointer'}}>
                  {PFMS.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <label style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase'}}>Scheme E Units</label>
                <input type="number" step="0.0001" value={form.e_u} onChange={e=>setForm(p=>({...p,e_u:e.target.value}))} placeholder="0.000" style={INP}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <label style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase'}}>Scheme C Units</label>
                <input type="number" step="0.0001" value={form.c_u} onChange={e=>setForm(p=>({...p,c_u:e.target.value}))} placeholder="0.000" style={INP}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <label style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase'}}>Scheme G Units</label>
                <input type="number" step="0.0001" value={form.g_u} onChange={e=>setForm(p=>({...p,g_u:e.target.value}))} placeholder="0.000" style={INP}/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:16}}>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <label style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase'}}>Scheme E Target %</label>
                <input type="number" value={form.e_p} onChange={e=>setForm(p=>({...p,e_p:e.target.value}))} placeholder="38" style={INP}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <label style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase'}}>Scheme C Target %</label>
                <input type="number" value={form.c_p} onChange={e=>setForm(p=>({...p,c_p:e.target.value}))} placeholder="24" style={INP}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <label style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase'}}>Scheme G Target %</label>
                <input type="number" value={form.g_p} onChange={e=>setForm(p=>({...p,g_p:e.target.value}))} placeholder="38" style={INP}/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:16}}>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <label style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase'}}>Total Contribution (Rs.)</label>
                <input type="number" value={form.tInv} onChange={e=>setForm(p=>({...p,tInv:e.target.value}))} placeholder="0" style={INP}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <label style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase'}}>Total Withdrawals (Rs.)</label>
                <input type="number" value={form.tOut} onChange={e=>setForm(p=>({...p,tOut:e.target.value}))} placeholder="0" style={INP}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <label style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase'}}>Contributions (No.)</label>
                <input type="number" value={form.nCont} onChange={e=>setForm(p=>({...p,nCont:e.target.value}))} placeholder="e.g. 183" style={INP}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <label style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase'}}>Start Date</label>
                <input type="date" value={form.sDate} onChange={e=>setForm(p=>({...p,sDate:e.target.value}))} style={INP}/>
              </div>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <NvBtn onClick={()=>setShowAdd(false)} T={T}>Cancel</NvBtn>
              <NvBtn onClick={addPfm} variant="primary" T={T} disabled={!form.pfm}><Ic.Check/> Confirm Add</NvBtn>
            </div>
          </div>
        )}

        <div style={{background:T.surface2,borderRadius:12,border:`1px solid ${T.border}`,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr style={{background:T.surface3}}>
                  <th style={{...tdS,color:T.text3,fontSize:11,fontWeight:700,textTransform:'uppercase'}}>Fund Manager</th>
                  <th style={{...tdS,color:T.text3,fontSize:11,fontWeight:700,textTransform:'uppercase'}}>Scheme E (Equity)</th>
                  <th style={{...tdS,color:T.text3,fontSize:11,fontWeight:700,textTransform:'uppercase'}}>Scheme C (Corp)</th>
                  <th style={{...tdS,color:T.text3,fontSize:11,fontWeight:700,textTransform:'uppercase'}}>Scheme G (Govt)</th>
                  <th style={{...tdS,color:T.text3,fontSize:11,fontWeight:700,textTransform:'uppercase'}}>Date</th>
                  <th style={{...tdS,color:T.text3,fontSize:11,fontWeight:700,textTransform:'uppercase'}}>Monthly Contribution</th>
                  <th style={{...tdS,color:T.text3,fontSize:11,fontWeight:700,textTransform:'uppercase'}}>Total Value</th>
                  <th style={tdS}/>
                </tr>
              </thead>
              <tbody>
                {(holdings||[]).map(h=>{
                  const rowTotal = (h.e * (navs[getNavKey(h.pfm,'E')]||0)) + (h.c * (navs[getNavKey(h.pfm,'C')]||0)) + (h.g * (navs[getNavKey(h.pfm,'G')]||0));
                  
                  // XIRR Calc using synthetic cash flows
                  let xirrVal = 0;
                  if(h.tInv > 0 && h.sDate){
                    const start = new Date(h.sDate);
                    const end = new Date();
                    const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
                    const count = h.nCont > 0 ? h.nCont : months;
                    const totalInv = parseFloat(h.tInv);
                    let weightSum = 0;
                    for(let i=0; i<count; i++) weightSum += Math.pow(1 + (growth/100), Math.floor(i/12));
                    const firstCont = totalInv / weightSum;
                    const cfs = [];

                    // Generate investment outflows
                    for(let i=0; i<count; i++){
                      const gapMs = (end.getTime() - start.getTime()) / count;
                      const time = start.getTime() + (gapMs * i);
                      if(time > end.getTime()) break;
                      const amt = firstCont * Math.pow(1 + (growth/100), Math.floor(i/12));
                      cfs.push({date: time, amount: -amt});
                    }
                    
                    // Withdrawal (positive cash in)
                    if(h.tOut > 0){
                      cfs.push({date: end.getTime() - 1000, amount: parseFloat(h.tOut)});
                    }
                    
                    // Terminal Value (positive cash in)
                    cfs.push({date: end.getTime(), amount: rowTotal});
                    
                    xirrVal = xirr(cfs);
                  }

                  return(
                    <tr key={h.id} style={{borderBottom:`1px solid ${T.border}`}} onMouseEnter={e=>e.currentTarget.style.background=T.surface4} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{...tdS,fontWeight:700,color:T.text}}>
                        <div style={{display:'flex',flexDirection:'column'}}>
                          <span>{h.pfm}</span>
                          <span style={{fontSize:10,color:T.text3,fontWeight:400}}>Target: {h.e_p}% E | {h.c_p}% C | {h.g_p}% G</span>
                        </div>
                      </td>
                      <NavCell h={h} sch="E" units={h.e}/>
                      <NavCell h={h} sch="C" units={h.c}/>
                      <NavCell h={h} sch="G" units={h.g}/>
                      <td style={tdS}>
                        <input type="date" value={h.lastDate||new Date().toISOString().split('T')[0]} onChange={e=>setHoldings(holdings.map(x=>x.id===h.id?{...x, lastDate:e.target.value}:x))} style={{...INP, padding:'6px 10px', fontSize:11, width:110}}/>
                      </td>
                      <td style={tdS}>
                        <div style={{display:'flex',gap:6,alignItems:'center'}}>
                          <input type="number" value={h.monthly} onChange={e=>setHoldings(holdings.map(x=>x.id===h.id?{...x, monthly:e.target.value}:x))} placeholder="Amount" style={{...INP, padding:'6px 10px', width:70, fontSize:12}}/>
                          <button onClick={()=>invest(h.id)} style={{background:T.accent,border:'none',borderRadius:6,color:'#fff',padding:'6px 10px',cursor:'pointer',fontSize:11,fontWeight:700, whiteSpace:'nowrap'}}>Invest</button>
                        </div>
                      </td>
                      <td style={{...tdS,fontWeight:800,color:T.accent,fontSize:14}}>{fmt(rowTotal,'INR')}</td>
                      <td style={tdS}>
                        <button onClick={()=>removePfm(h.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:4}} onMouseEnter={e=>e.currentTarget.style.color=T.danger} onMouseLeave={e=>e.currentTarget.style.color=T.text3}><Ic.Trash/></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!(holdings||[]).length && (
            <div style={{padding:60,textAlign:'center',color:T.text3,fontSize:14}}>No NPS holdings added. Track your retirement corpus by adding your Pension Fund Manager details above. <br/><span style={{fontSize:11, opacity:0.7, marginTop:8, display:'inline-block'}}>Click on the NAV value to manually edit it.</span></div>
          )}
        </div>
        
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>
          <div style={{background:T.surface2,borderRadius:12,padding:20,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:12,color:T.text3,fontWeight:700,textTransform:'uppercase',marginBottom:12, display:'flex', justifyContent:'space-between'}}>
              <span>Asset Allocation</span>
              <span style={{fontSize:10, textTransform:'none', opacity:0.7}}>*Click NAV to edit</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {[
                {label:'Equity (E)', val:(holdings||[]).reduce((a,h)=>a+(h.e*(navs[getNavKey(h.pfm,'E')]||0)),0), color:T.accent},
                {label:'Corporate (C)', val:(holdings||[]).reduce((a,h)=>a+(h.c*(navs[getNavKey(h.pfm,'C')]||0)),0), color:T.warning},
                {label:'Government (G)', val:(holdings||[]).reduce((a,h)=>a+(h.g*(navs[getNavKey(h.pfm,'G')]||0)),0), color:T.success},
              ].map(asset=>{
                const pct=totalVal?(asset.val/totalVal*100):0;
                return(
                  <div key={asset.label}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                      <span style={{color:T.text2}}>{asset.label}</span>
                      <span style={{fontWeight:700,color:T.text}}>{pct.toFixed(1)}%</span>
                    </div>
                    <div style={{height:6,background:T.surface4,borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pct}%`,background:asset.color,borderRadius:3}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: PHYSICAL GOLD ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function GoldModule({T,holdings,setHoldings,prices,onClose}) {
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({grams:'',invVal:'',date:new Date().toISOString().split('T')[0],note:''});
  
  const goldPrice = prices['PHYSICAL_GOLD']?.current || 0;
  const totalGrams = (holdings||[]).reduce((a,h)=>a+(parseFloat(h.grams)||0),0);
  const totalInv = (holdings||[]).reduce((a,h)=>a+(parseFloat(h.invVal)||0),0);
  
  // Final value includes 3% GST as per user requirement
  const currentValBase = totalGrams * goldPrice;
  const currentValWithGst = Math.round(currentValBase * 1.03);
  const totalGain = currentValWithGst - totalInv;
  const gainPct = totalInv > 0 ? (totalGain/totalInv)*100 : 0;

  const handleAdd = () => {
    if(!form.grams || !form.invVal) return alert("Please enter weight and invoice value");
    const newH = {
      id: Date.now(),
      grams: parseFloat(form.grams),
      invVal: parseFloat(form.invVal),
      date: form.date,
      note: form.note
    };
    setHoldings(p => [...(p||[]), newH]);
    setForm({grams:'',invVal:'',date:new Date().toISOString().split('T')[0],note:''});
    setShowAdd(false);
  };

  const removeH = (id) => {
    if(window.confirm("Remove this gold entry?")) {
      setHoldings(p => p.filter(h=>h.id!==id));
    }
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:24,animation:'fadeIn 0.3s ease-out'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <div style={{fontSize:24,fontWeight:800,color:'#FFD700',letterSpacing:'-0.02em',marginBottom:4,display:'flex',alignItems:'center',gap:12}}>
            <span>🟡 Physical Gold Portfolio</span>
            <div style={{fontSize:10,background:'rgba(255,215,0,0.15)',color:'#FFD700',padding:'2px 8px',borderRadius:20,border:'1px solid rgba(255,215,0,0.3)',letterSpacing:'.05em'}}>24K TRACKER</div>
          </div>
          <div style={{fontSize:14,color:T.text3}}>Secure asset tracking with live global gold rates & 3% GST logic</div>
        </div>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <div style={{display:'flex', alignItems:'center', gap:8, background:T.surface2, border:`1px solid ${T.border}`, borderRadius:8, padding:'4px 12px'}}>
            <span style={{fontSize:11, fontWeight:700, color:T.text3, textTransform:'uppercase'}}>Live Rate (24K)</span>
            <span style={{fontSize:13,fontWeight:800,color:'#FFD700'}}>₹{Math.round(goldPrice).toLocaleString('en-IN')}/g</span>
          </div>
          <button onClick={()=>setShowAdd(!showAdd)} style={{background:'#FFD700',color:'#000',border:'none',padding:'8px 16px',borderRadius:8,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:8,transition:'all .1s'}} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.02)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>Add Gold Purchase</button>
          {onClose&&<button onClick={onClose} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,cursor:'pointer',color:T.text3,padding:'8px',display:'flex'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}>X</button>}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16}}>
        {[
          {l:'Total Weight', v:totalGrams.toFixed(3)+' g', c:T.text},
          {l:'Initial (Invested)', v:totalInv.toLocaleString('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}), c:T.text},
          {l:'Current Value (+3% GST)', v:currentValWithGst.toLocaleString('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}), c:'#FFD700'},
          {l:'Total P&L', v:`${totalGain>=0?'+':'−'}${Math.abs(totalGain).toLocaleString('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0})} (${gainPct.toFixed(2)}%)`, c:totalGain>=0?T.success:T.danger}
        ].map((m,i)=>(
          <div key={i} style={{background:T.surface2,border:`1px solid ${T.border}`,borderRadius:12,padding:'16px 20px',display:'flex',flexDirection:'column',gap:4,boxShadow:m.c==='#FFD700'?`0 0 20px ${m.c}10`:''}}>
            <div style={{fontSize:11,color:T.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em'}}>{m.l}</div>
            <div style={{fontSize:22,fontWeight:800,color:m.c}}>{m.v}</div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div style={{background:T.surface2,border:`1px solid ${T.border}`,borderRadius:12,padding:24,display:'flex',flexDirection:'column',gap:20,boxShadow:'0 12px 32px rgba(0,0,0,.2)'}}>
          <div style={{fontSize:15,fontWeight:700,color:T.text}}>New Gold Purchase / Entry</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16}}>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <label style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase'}}>Weight (Grams)</label>
              <input type="number" step="0.001" value={form.grams} onChange={e=>setForm(p=>({...p,grams:e.target.value}))} placeholder="0.000" style={{background:T.surface3,border:`1px solid ${T.border}`,borderRadius:8,padding:'10px 12px',color:T.text,fontSize:14}}/>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <label style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase'}}>Invoice Value (Total Paid)</label>
              <input type="number" value={form.invVal} onChange={e=>setForm(p=>({...p,invVal:e.target.value}))} placeholder="₹ 0.00" style={{background:T.surface3,border:`1px solid ${T.border}`,borderRadius:8,padding:'10px 12px',color:T.text,fontSize:14}}/>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <label style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase'}}>Purchase Date</label>
              <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={{background:T.surface3,border:`1px solid ${T.border}`,borderRadius:8,padding:'10px 12px',color:T.text,fontSize:14}}/>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <label style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase'}}>Note / Description</label>
            <input type="text" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="e.g. 24K Coin from Tanishq" style={{background:T.surface3,border:`1px solid ${T.border}`,borderRadius:8,padding:'10px 12px',color:T.text,fontSize:14}}/>
          </div>
          <div style={{display:'flex',gap:12}}>
            <button onClick={handleAdd} style={{background:'#FFD700',color:'#000',border:'none',padding:'10px 20px',borderRadius:8,fontWeight:700,cursor:'pointer'}}>Save Entry</button>
            <button onClick={()=>setShowAdd(false)} style={{background:'none',border:`1px solid ${T.border}`,color:T.text3,padding:'10px 20px',borderRadius:8,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}

      {/* Entries Table */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:T.surface2,borderBottom:`1px solid ${T.border}`}}>
              {['Date','Weight (g)','Invested (Inv)','Current Value','P&L','Note',''].map(h=>(
                <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:11,color:T.text3,fontWeight:700,textTransform:'uppercase'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(holdings||[]).length===0?(
              <tr><td colSpan="7" style={{padding:'40px',textAlign:'center',color:T.text3,fontSize:14}}>No gold entries found. Add your first purchase above.</td></tr>
            ):(holdings||[]).sort((a,b)=>new Date(b.date)-new Date(a.date)).map(h=>{
              const cv = Math.round(h.grams * goldPrice * 1.03);
              const gain = cv - h.invVal;
              return (
                <tr key={h.id} style={{borderBottom:`1px solid ${T.border}`,transition:'background .1s'}} onMouseEnter={e=>e.currentTarget.style.background=T.surface2} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'14px 16px',fontSize:13,color:T.text2}}>{new Date(h.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
                  <td style={{padding:'14px 16px',fontSize:13,fontWeight:600}}>{h.grams.toFixed(3)}</td>
                  <td style={{padding:'14px 16px',fontSize:13}}>{h.invVal.toLocaleString('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0})}</td>
                  <td style={{padding:'14px 16px',fontSize:13,color:'#FFD700',fontWeight:700}}>{cv.toLocaleString('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0})}</td>
                  <td style={{padding:'14px 16px',fontSize:13,color:gain>=0?T.success:T.danger,fontWeight:600}}>{gain>=0?'+':'−'}{Math.abs(gain).toLocaleString('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0})}</td>
                  <td style={{padding:'14px 16px',fontSize:13,color:T.text3}}>{h.note || '-'}</td>
                  <td style={{padding:'14px 16px',textAlign:'right'}}>
                    <button onClick={()=>removeH(h.id)} style={{background:'none',border:'none',color:T.text3,cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.color=T.danger} onMouseLeave={e=>e.currentTarget.style.color=T.text3}>X</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────