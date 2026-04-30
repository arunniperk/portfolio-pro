import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { isUS, short, fmtQty, fmt, fmtDual, fmtBig, fmtPct, gColor, sortRows } from './utils';
import { mkT, PIE, PORT_COLORS, DEF_PF, TWEAK_DEF } from './theme';
import { Ic } from './icons';
import { callGroq, callGemini, callAI, extractJSON } from './ai';
import { useYahooSearch, useNotes } from './hooks';
import { getItemSync, setItemSync, flushAll } from './storage';
import './mobile.css';

// ── ERROR BOUNDARY ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={error:null};}
  static getDerivedStateFromError(e){return{error:e};}
  componentDidCatch(e,info){console.error('Portfolio Manager error:',e,info);}
  render(){
    if(!this.state.error)return this.props.children;
    const T=this.props.theme||{bg:'#0a0a0a',surface:'#161616',surface2:'#1c1c1c',text:'#fff',text2:'#a0a0a0',text3:'#606060',accent:'#76b900',danger:'#f44336',border:'#2a2a2a',r:8};
    return(
      <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:T.bg,flexDirection:'column',gap:16,padding:32}}>
        <div style={{width:56,height:56,borderRadius:12,background:'rgba(244,67,54,.15)',border:'1px solid rgba(244,67,54,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>⚠</div>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:18,fontWeight:700,color:T.text,marginBottom:6}}>Something went wrong</div>
          <div style={{fontSize:13,color:T.text3,marginBottom:16,maxWidth:400,lineHeight:1.6}}>{this.state.error?.message||'An unexpected error occurred.'}</div>
          <button onClick={()=>this.setState({error:null})}
            style={{padding:'8px 20px',background:T.accent,border:'none',borderRadius:T.r,color:'#000',fontWeight:700,cursor:'pointer',fontSize:13}}>
            Try Again
          </button>
          <button onClick={()=>window.location.reload()}
            style={{padding:'8px 20px',background:'transparent',border:`1px solid ${T.border}`,borderRadius:T.r,color:T.text2,fontWeight:600,cursor:'pointer',fontSize:13,marginLeft:8}}>
            Reload App
          </button>
        </div>
        <details style={{maxWidth:500,width:'100%'}}>
          <summary style={{fontSize:11,color:T.text3,cursor:'pointer',marginBottom:6}}>Technical details</summary>
          <pre style={{fontSize:10,color:T.text3,background:T.surface2,padding:12,borderRadius:6,overflow:'auto',maxHeight:200,border:`1px solid ${T.border}`}}>
            {this.state.error?.stack||'No stack trace'}
          </pre>
        </details>
      </div>
    );
  }
}


// Theme, icons, utils, AI imported from separate modules
// ── REMOVED: mkT moved to theme.js ──
// Theme, icons, utils, AI providers: imported from ./theme, ./icons, ./utils, ./ai







import { NvBtn, NvInput, Badge, SortTh } from './components/ui';
import { TargetCell, UnpledgedQtyCell, StatCard } from './components/cells';

import { PriceChart } from './components/PriceChart';

// ── STOCK DETAIL VIEW ─────────────────────────────────────────────────────────
import { StockDetailView } from './components/StockDetailView';
import { DonutChart, PLBarChart } from './components/charts';
import { CSVImportModal, AISetupModal } from './components/modals';
import { AIAnalysis } from './components/AIAnalysis';

// ── HOLDINGS TABLE ────────────────────────────────────────────────────────────
import { Section } from './components/Section';
function SettingsPanel({tweaks,onUpdate,onClose,groqKey,geminiKey,primaryAI,onSaveAIKeys,goldApiKey,setGoldApiKey,T}) {
  const [editing,setEditing]=useState(null);
  const [newKey,setNewKey]=useState('');
  const [testing,setTesting]=useState(false);
  const [testResult,setTestResult]=useState(null);
  const [pinEntry,setPinEntry]=useState('');
  const [showPinForm,setShowPinForm]=useState(false);
  const testKey=async(provider)=>{
    setTesting(true);setTestResult(null);
    try{
      if(provider==='groq') await callGroq(newKey.trim(),'Reply OK');
      else await callGemini(newKey.trim(),'Reply OK');
      setTestResult('ok');
    }catch(e){setTestResult(e.message);}
    setTesting(false);
  };
  const saveKey=(provider)=>{
    const gk=provider==='groq'?newKey.trim():groqKey||'';
    const gmk=provider==='gemini'?newKey.trim():geminiKey||'';
    onSaveAIKeys(gk,gmk,primaryAI);setEditing(null);
  };
  const removeKey=(provider)=>{
    if(window.confirm(`Are you sure you want to remove the ${provider} API key? AI analysis will be disabled for this provider.`)){
      onSaveAIKeys(provider==='groq'?'':groqKey||'',provider==='gemini'?'':geminiKey||'',primaryAI);
    }
  };
  const setPrim=(p)=>onSaveAIKeys(groqKey||'',geminiKey||'',p);
  const PROVS=[
    {id:'groq',   label:'Groq',   icon:'⚡', grad:'linear-gradient(135deg,#f55036,#ff8c00)', key:groqKey, ph:'gsk_…'},
    {id:'gemini', label:'Gemini', icon:'✦', grad:'linear-gradient(135deg,#4285f4,#34a853)', key:geminiKey, ph:'AIza…'},
  ];
  return(
    <div style={{position:'fixed',inset:0,zIndex:1500,display:'flex',alignItems:'flex-start',justifyContent:'flex-end',paddingTop:52}}>
      <div onClick={onClose} style={{position:'absolute',inset:0}}/>
      <div style={{position:'relative',width:340,background:T.surface,borderRadius:T.r,border:`1px solid ${T.border2}`,boxShadow:'0 16px 48px rgba(0,0,0,.4)',margin:'8px 8px 0 0',overflow:'hidden'}}>
        <div style={{padding:'14px 18px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:14,fontWeight:700,color:T.text}}>Settings</span>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,display:'flex',padding:4}}><Ic.X/></button>
        </div>
        <div style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:14,maxHeight:'85vh',overflowY:'auto'}}>
          {[{label:'Dark Mode',key:'darkMode'},{label:'Compact Rows',key:'compactRows'},{label:'Show P&L Charts',key:'showCharts'}].map(({label,key})=>(
            <div key={key} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,color:T.text2}}>{label}</span>
              <div onClick={()=>onUpdate(key,!tweaks[key])} style={{width:40,height:22,borderRadius:11,background:tweaks[key]?T.accent:T.surface4,position:'relative',cursor:'pointer',transition:'background .2s',border:`1px solid ${tweaks[key]?T.accent:T.border2}`}}>
                <div style={{position:'absolute',top:2,left:tweaks[key]?'calc(100% - 18px)':2,width:16,height:16,borderRadius:8,background:'#fff',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}/>
              </div>
            </div>
          ))}
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:13,color:T.text2}}>Auto Refresh</span><span style={{fontSize:13,fontWeight:600,color:T.accent}}>{tweaks.autoRefreshMins} min</span></div>
            <input type="range" min={1} max={30} step={1} value={tweaks.autoRefreshMins} onChange={e=>onUpdate('autoRefreshMins',parseInt(e.target.value))} style={{accentColor:T.accent}}/>
          </div>
          <div style={{borderTop:`1px solid ${T.border}`,paddingTop:14}}>
            <div style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>AI Providers</div>
            {PROVS.map(prov=>{
              const isActive=!!prov.key,isPrimary=primaryAI===prov.id,isEditing=editing===prov.id;
              return(
                <div key={prov.id} style={{marginBottom:10,background:T.surface3,borderRadius:8,border:`1px solid ${isPrimary&&isActive?T.accent:T.border}`,padding:'10px 12px',transition:'border-color .15s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:isEditing?10:4}}>
                    <div style={{width:24,height:24,borderRadius:5,background:prov.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>{prov.icon}</div>
                    <span style={{fontSize:12,fontWeight:700,color:T.text,flex:1}}>{prov.label}</span>
                    {isActive?<span style={{fontSize:9,background:T.successBg,color:T.success,padding:'2px 6px',borderRadius:8,fontWeight:700}}>Active</span>:<span style={{fontSize:9,background:T.surface4,color:T.text3,padding:'2px 6px',borderRadius:8}}>Off</span>}
                    {isActive&&<button onClick={()=>setPrim(prov.id)} style={{fontSize:9,padding:'2px 7px',borderRadius:8,border:`1px solid ${isPrimary?T.accent:T.border2}`,background:isPrimary?T.accentBg:'transparent',color:isPrimary?T.accent:T.text3,cursor:'pointer',fontWeight:600}}>{isPrimary?'★ Primary':'Set Primary'}</button>}
                  </div>
                  {isEditing?(
                    <div style={{display:'flex',flexDirection:'column',gap:7}}>
                      <NvInput value={newKey} onChange={e=>setNewKey(e.target.value)} placeholder={prov.ph} T={T} style={{fontFamily:'monospace',fontSize:11}}/>
                      {testResult==='ok'&&<span style={{fontSize:11,color:T.success}}>✓ Key works</span>}
                      {testResult&&testResult!=='ok'&&<span style={{fontSize:11,color:T.danger,wordBreak:'break-word'}}>✗ {testResult}</span>}
                      <div style={{display:'flex',gap:5}}>
                        <NvBtn onClick={()=>testKey(prov.id)} disabled={testing||!newKey.trim()} T={T}>{testing?'…':'Test'}</NvBtn>
                        <NvBtn onClick={()=>saveKey(prov.id)} variant="primary" disabled={!newKey.trim()} T={T}>Save</NvBtn>
                        <NvBtn onClick={()=>{setEditing(null);setTestResult(null);}} T={T}>Cancel</NvBtn>
                      </div>
                    </div>
                  ):(
                    <div style={{display:'flex',gap:6}}>
                      <NvBtn onClick={()=>{setNewKey(prov.key||'');setEditing(prov.id);setTestResult(null);}} T={T}>{isActive?'Update':'Add Key'}</NvBtn>
                      {isActive&&<NvBtn onClick={()=>removeKey(prov.id)} variant="danger" T={T}>Remove</NvBtn>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{borderTop:`1px solid ${T.border}`,paddingTop:14}}>
            <div style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>Gold Data Provider</div>
            <div style={{background:T.surface3,borderRadius:8,border:`1px solid ${T.border}`,padding:'10px 12px'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <div style={{width:24,height:24,borderRadius:5,background:'linear-gradient(135deg,#FFD700,#b8860b)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>🟡</div>
                <span style={{fontSize:12,fontWeight:700,color:T.text,flex:1}}>GoldAPI.io</span>
                {goldApiKey?<span style={{fontSize:9,background:T.successBg,color:T.success,padding:'2px 6px',borderRadius:8,fontWeight:700}}>Active</span>:<span style={{fontSize:9,background:T.surface4,color:T.text3,padding:'2px 6px',borderRadius:8}}>Fallback (Yahoo)</span>}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:7}}>
                <NvInput value={goldApiKey} onChange={e=>setGoldApiKey(e.target.value)} placeholder="Enter GoldAPI.io Key" T={T} style={{fontFamily:'monospace',fontSize:11}}/>
                <div style={{fontSize:10,color:T.text3}}>Get a free key at <a href="https://goldapi.io" target="_blank" style={{color:T.accent}}>goldapi.io</a> for better Indian rates.</div>
              </div>
            </div>
            {groqKey&&geminiKey&&<div style={{fontSize:11,color:T.text3,marginTop:12}}>Both configured — <b style={{color:T.text}}>{primaryAI==='groq'?'Groq':'Gemini'}</b> is primary with auto-fallback.</div>}
          </div>
          <div style={{borderTop:`1px solid ${T.border}`,paddingTop:14}}>
            <div style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>Privacy & Security</div>
            <div style={{background:T.surface3,borderRadius:8,border:`1px solid ${T.border}`,padding:'10px 12px'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <div style={{width:24,height:24,borderRadius:5,background:'linear-gradient(135deg,#76b900,#4a7500)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>🔒</div>
                <span style={{fontSize:12,fontWeight:700,color:T.text,flex:1}}>Password Protection</span>
                {tweaks.pin ? <span style={{fontSize:9,background:T.successBg,color:T.success,padding:'2px 6px',borderRadius:8,fontWeight:700}}>Locked</span> : <span style={{fontSize:9,background:T.surface4,color:T.text3,padding:'2px 6px',borderRadius:8}}>Unlocked</span>}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <div style={{display:'flex',gap:6}}>
                  <NvBtn onClick={()=>setShowPinForm(!showPinForm)} T={T}>{tweaks.pin ? 'Manage PIN' : 'Set PIN'}</NvBtn>
                </div>
                {showPinForm && (
                  <div style={{background:T.surface4,padding:12,borderRadius:8,display:'flex',flexDirection:'column',gap:10}}>
                    <div style={{fontSize:11,color:T.text2}}>{tweaks.pin ? "Change or Remove PIN" : "Enter 4-digit PIN"}</div>
                    <NvInput type="password" value={pinEntry} onChange={e=>setPinEntry(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="4-digit PIN" T={T}/>
                    <div style={{display:'flex',gap:6}}>
                      <NvBtn onClick={()=>{
                        if(pinEntry.length!==4) { alert("PIN must be 4 digits"); return; }
                        if(tweaks.pin){
                          const cur = window.prompt("Enter current PIN to confirm:");
                          if(cur !== tweaks.pin) { alert("Incorrect current PIN"); return; }
                        }
                        onUpdate('pin', pinEntry);
                        alert("PIN updated successfully");
                        setShowPinForm(false);
                        setPinEntry('');
                      }} variant="primary" T={T}>Save</NvBtn>
                      {tweaks.pin && <NvBtn onClick={()=>{
                        const cur = window.prompt("Enter current PIN to confirm removal:");
                        if(cur === tweaks.pin) {
                          onUpdate('pin', '');
                          alert("PIN removed");
                          setShowPinForm(false);
                          setPinEntry('');
                        } else if(cur !== null) {
                          alert("Incorrect current PIN");
                        }
                      }} variant="danger" T={T}>Remove</NvBtn>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



// ── PORTFOLIO TABS ────────────────────────────────────────────────────────────
function PortfolioTabs({portfolios,activeId,onSwitch,onAdd,onRename,onDelete,T}) {
  const [editId,setEditId]=useState(null);const [editName,setEditName]=useState('');const inputRef=useRef();
  const commit=()=>{if(editName.trim())onRename(editId,editName.trim());setEditId(null);};
  useEffect(()=>{if(editId&&inputRef.current)inputRef.current.focus();},[editId]);
  return(
    <div style={{display:'flex',alignItems:'center',gap:4,padding:'0 20px',borderBottom:`1px solid ${T.border}`,background:T.surface,height:38,flexShrink:0,overflowX:'auto',position:'relative',zIndex:10}}>
      {portfolios.map((p,i)=>{const active=p.id===activeId,color=PORT_COLORS[i%PORT_COLORS.length];return(
        <div key={p.id} onClick={()=>onSwitch(p.id)} style={{display:'flex',alignItems:'center',gap:6,height:38,padding:'0 14px',cursor:'pointer',flexShrink:0,userSelect:'none',borderBottom:active?`2px solid ${color}`:'2px solid transparent',color:active?T.text:T.text3,transition:'all .15s',fontSize:12,fontWeight:active?600:400}}>
          {editId===p.id?<input ref={inputRef} value={editName} onChange={e=>setEditName(e.target.value)} onBlur={commit} onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Enter')commit();if(e.key==='Escape')setEditId(null);}} style={{width:100,padding:'1px 6px',background:T.surface3,color:T.text,fontSize:12,border:`1px solid ${color}`,borderRadius:4,outline:'none'}}/>
          :<span onDoubleClick={e=>{e.stopPropagation();setEditId(p.id);setEditName(p.name);}}>{p.name}</span>}
          <span style={{fontSize:10,background:active?color+'20':T.surface3,color:active?color:T.text3,padding:'1px 6px',borderRadius:10,fontWeight:600}}>{p.holdings.length}</span>
          {portfolios.length>1&&active&&<button onClick={e=>{e.stopPropagation();onDelete(p.id);}} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:'1px 2px',display:'flex',lineHeight:1,transition:'color .1s'}} onMouseEnter={e=>e.currentTarget.style.color=T.danger} onMouseLeave={e=>e.currentTarget.style.color=T.text3}><Ic.X/></button>}
        </div>
      );})}
      <button onClick={onAdd} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 10px',marginLeft:4,border:`1px solid ${T.border}`,borderRadius:6,background:'transparent',color:T.text3,cursor:'pointer',fontSize:11,fontWeight:600,transition:'all .13s',flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.color=T.accent;e.currentTarget.style.borderColor=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.color=T.text3;e.currentTarget.style.borderColor=T.border;}}><Ic.Plus/> New</button>
      <span style={{marginLeft:8,fontSize:10,color:T.text3,flexShrink:0,opacity:.5}}>Double-click to rename</span>
    </div>
  );
}



// ═══════════════════════════════════════════════════════════════════════════════
// ── MODULE: NOTES PER STOCK ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// Storage: pm_notes = { "SYMBOL": "note text" }
// Also exports useNote() for StockDetailView inline note

// useNotes: imported from ./hooks

function BottomNav({activeId, activeModule, onSwitch, T, NAV, MOD_NAV}) {
  const items = [
    {id: 'IN', label: 'Indian', icon: <Ic.India/>},
    {id: 'US', label: 'US', icon: <Ic.US/>},
    {id: 'NPS', label: 'NPS', icon: '🛡️'},
    {id: 'GOLD', label: 'Gold', icon: '🟡'},
    {id: 'watchlist', label: 'Watch', icon: '👁'},
    {id: 'news', label: 'News', icon: '📰'},
    {id: 'alerts', label: 'Alerts', icon: '🔔'},
  ];
  return (
    <div className="bottom-nav" style={{height:60, background:T.sidebar, borderTop:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-around', position:'fixed', bottom:0, left:0, right:0, zIndex:1000}}>
      {items.map(item => {
        const isActive = (item.id === 'IN' || item.id === 'US') ? (!activeModule && activeId === item.id) : (activeModule === item.id);
        const color = isActive ? T.accent : T.text3;
        return (
          <div key={item.id} onClick={() => onSwitch(item.id)} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer', color}}>
            <div style={{fontSize:18, display:'flex'}}>{item.icon}</div>
            <div style={{fontSize:10, fontWeight:isActive?700:400}}>{item.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// Lazy-loaded modules for better startup speed
const NotesModule     = lazy(() => import('./modules').then(m => ({ default: m.NotesModule })));
const AlertsModule    = lazy(() => import('./modules').then(m => ({ default: m.AlertsModule })));
const SectorModule    = lazy(() => import('./modules').then(m => ({ default: m.SectorModule })));
// [BenchmarkModule Lazy Import Removed]

const NewsModule      = lazy(() => import('./modules').then(m => ({ default: m.NewsModule })));
const HistoryModule   = lazy(() => import('./modules').then(m => ({ default: m.HistoryModule })));
const WatchlistModule = lazy(() => import('./modules').then(m => ({ default: m.WatchlistModule })));
const WatchlistHistoryModule = lazy(() => import('./modules').then(m => ({ default: m.WatchlistHistoryModule })));
const NPSModule       = lazy(() => import('./modules').then(m => ({ default: m.NPSModule })));
const GoldModule      = lazy(() => import('./modules').then(m => ({ default: m.GoldModule })));
const MFModule        = lazy(() => import('./modules').then(m => ({ default: m.MFModule })));
const PPFModule       = lazy(() => import('./modules').then(m => ({ default: m.PPFModule })));
const EFModule        = lazy(() => import('./modules').then(m => ({ default: m.EFModule })));

function AppInner() {
  const [isLoaded,setIsLoaded]=useState(false);
  const [isLocked,setIsLocked]=useState(false);
  const [tweaks,setTweaks]=useState(() => {
    const saved = getItemSync('pm_tweaks');
    return saved ? {...TWEAK_DEF, ...JSON.parse(saved)} : TWEAK_DEF;
  });
  const [pinInput,setPinInput]=useState('');

  useEffect(() => {
    if (!isLocked) return;
    const handleKD = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        const n = e.key;
        setPinInput(prev => {
          if (prev.length < 4) {
            const ni = prev + n;
            if (ni === tweaks.pin) { setIsLocked(false); return ''; }
            else if (ni.length === 4) { alert("Incorrect PIN"); return ''; }
            return ni;
          }
          return prev;
        });
      } else if (e.key === 'Backspace') {
        setPinInput(p => p.slice(0,-1));
      }
    };
    window.addEventListener('keydown', handleKD);
    return () => window.removeEventListener('keydown', handleKD);
  }, [isLocked, tweaks.pin]);
  const [portfolios,setPortfolios]=useState(() => {
    const saved = getItemSync('pm_portfolios');
    return saved ? JSON.parse(saved) : DEF_PF;
  });
  const [activeId,setActiveId]=useState(() => {
    const saved = getItemSync('pm_activeId');
    return saved ? JSON.parse(saved) : 1;
  });
  const [sidebarCollapsed,setSidebarCollapsed]=useState(() => JSON.parse(getItemSync('pm_sidebar_collapsed') || 'false'));
  const [rightSidebarCollapsed,setRightSidebarCollapsed]=useState(() => JSON.parse(getItemSync('pm_right_sidebar_collapsed') || 'false'));
  const [groqKey,setGroqKey]=useState(() => getItemSync('pm_groq_key') || '');
  const [geminiKey,setGeminiKey]=useState(() => getItemSync('pm_gemini_key') || '');
  const [primaryAI,setPrimaryAI]=useState(() => getItemSync('pm_primary_ai') || 'groq');
  const [goldApiKey,setGoldApiKey]=useState(() => getItemSync('pm_gold_api_key') || '');
  const [history,setHistory]=useState(() => {
    const raw = JSON.parse(getItemSync('pm_portfolio_history') || '[]');
    return raw.slice(-365);
  });
  const [navs,setNavs]=useState(() => {
    const saved = getItemSync('pm_nps_navs');
    if(saved) return JSON.parse(saved);
    return {
      'SBI_E': 48.25, 'SBI_C': 32.10, 'SBI_G': 28.45,
      'HDFC_E': 52.12, 'HDFC_C': 34.50, 'HDFC_G': 30.15,
      'ICICI_E': 50.80, 'ICICI_C': 33.20, 'ICICI_G': 29.40,
      'LIC_E': 42.15, 'LIC_C': 31.05, 'LIC_G': 27.90,
      'UTI_E': 70.4812, 'UTI_C': 40.3962, 'UTI_G': 36.6234
    };
  });
  const [alerts,setAlerts]=useState(() => {
    const raw = JSON.parse(getItemSync('pm_alerts') || '[]');
    return raw.map(a => ({
      ...a,
      t1: a.t1 ?? a.price ?? 0,
      t1Hit: a.t1Hit ?? a.triggered ?? false,
      t1HitAt: a.t1HitAt ?? a.triggeredAt ?? null,
      t2: a.t2 ?? null,
      t2Hit: a.t2Hit ?? false,
      t2HitAt: a.t2HitAt ?? null
    }));
  });
  const [npsHoldings,setNpsHoldings]=useState(() => {
    const saved = getItemSync('pm_nps');
    return saved ? JSON.parse(saved) : [];
  });
  const [goldHoldings,setGoldHoldings]=useState(() => {
    const saved = getItemSync('pm_gold');
    return saved ? JSON.parse(saved) : [];
  });
  const [npsGrowth,setNpsGrowth]=useState(() => {
    const saved = getItemSync('pm_nps_growth');
    return saved ? parseFloat(saved) : 7;
  });
  const [mfHoldings,setMfHoldings]=useState(() => {
    const saved = getItemSync('pm_mf');
    return saved ? JSON.parse(saved) : [];
  });
  const [ppfHoldings,setPpfHoldings]=useState(() => {
    const saved = getItemSync('pm_ppf');
    return saved ? JSON.parse(saved) : [];
  });
  const [emergencyFund,setEmergencyFund]=useState(() => {
    const saved = getItemSync('pm_emergency');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    // Run after initial mount to keep the UI thread responsive
    setTimeout(() => {
      try {
        if(tweaks.pin) setIsLocked(true);
        
        const gKey = getItemSync('pm_groq_key');
        const gmKey = getItemSync('pm_gemini_key');
        setShowAISetup(gKey === null && gmKey === null);
      } catch(e) {
        console.error("Storage load error:", e);
      } finally {
        setIsLoaded(true);
      }
    }, 0);
  }, []);

  const [aiAnalyses,setAiAnalyses]=useState({});
  const [usdInr,setUsdInr]=useState(null);
  const [showAISetup,setShowAISetup]=useState(false);

  const [showSettings,setShowSettings]=useState(false);
  const [importModal,setImportModal]=useState(null);
  const T=useMemo(()=>mkT(tweaks.darkMode),[tweaks.darkMode]);
  const [prices,setPrices]=useState({});
  const pricesRef=useRef({});
  useEffect(()=>{pricesRef.current=prices;},[prices]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const [lastUpdated,setLastUpdated]=useState(null);
  const [updateAvail,setUpdateAvail]=useState(false);
  const [mainTab,setMainTab]=useState('IN');
  const [activeModule,setActiveModule]=useState(null);
  const [openStockTabs,setOpenStockTabs]=useState([]);
  const [stockDetails,setStockDetails]=useState({});
  const isElectron = !!window.electronAPI;
  const isCapacitor = false;
  const isMobile = window.innerWidth < 768;
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (window.electronAPI?.onAppClosing) {
      window.electronAPI.onAppClosing(() => setIsClosing(true));
    }
  }, []);

  const handleFinalExit = async (saveBackup) => {
    if (saveBackup) {
      const csvLines = ["Type,Category/Symbol,Item/Name,Value1,Value2,Value3"];
      // Holdings
      portfolios.forEach(p => {
        p.holdings.forEach(h => {
          const n = h.name.includes(',') ? `"${h.name}"` : h.name;
          csvLines.push(`HOLDING,${p.name},${h.symbol},${n},${h.qty},${h.buyPrice}`);
        });
      });
      // Alerts
      alerts.forEach(a => {
        const n = a.name.includes(',') ? `"${a.name}"` : a.name;
        csvLines.push(`ALERT,${a.symbol},${n},${a.t1},${a.t2||''}`);
      });
      // NPS Holdings
      npsHoldings.forEach(h => {
        csvLines.push(`NPS_HOLDING,${h.pfm},E:${h.e}|C:${h.c}|G:${h.g},${h.tInv},${h.sDate}`);
      });
      // NPS Settings
      csvLines.push(`NPS_SETTING,Growth/Step-up,${npsGrowth},,`);
      // Gold Holdings
      goldHoldings.forEach(h => {
        csvLines.push(`GOLD_HOLDING,${h.date},${h.grams},${h.invVal},${h.note||''}`);
      });
      // Mutual Funds
      mfHoldings.forEach(h => {
        const n = h.name.includes(',') ? `"${h.name}"` : h.name;
        csvLines.push(`MF_HOLDING,${h.schemeCode},${n},${h.units},${h.invVal},${h.date}`);
      });
      // PPF
      ppfHoldings.forEach(h => {
        csvLines.push(`PPF_CONTRIBUTION,${h.date},Contribution,${h.amount},,`);
      });
      // Emergency Fund
      emergencyFund.forEach(h => {
        const b = h.bank.includes(',') ? `"${h.bank}"` : h.bank;
        const hl = (h.holder||'—').includes(',') ? `"${h.holder}"` : (h.holder||'—');
        csvLines.push(`EMERGENCY_FUND,${b},${hl},${h.amount},,`);
      });
      
      const csv = csvLines.join('\n');
      const filename = `Portfolio_AutoBackup_${new Date().toISOString().slice(0,10)}_${Date.now()}.csv`;
      await window.electronAPI.fileSave(filename, csv);
    }
    await flushAll();
    window.electronAPI.flushComplete();
  };

  // Fetch USD/INR rate from Yahoo Finance
  useEffect(()=>{
    const fetchFx=async()=>{
      try{
        const r=await fetch('https://query1.finance.yahoo.com/v8/finance/chart/USDINR%3DX?interval=1d&range=1d',{headers:{Accept:'application/json'}});
        if(r.ok){const j=await r.json();const price=j?.chart?.result?.[0]?.meta?.regularMarketPrice;if(price)setUsdInr(price);}
      }catch{}
    };
    fetchFx();
    const t=setInterval(fetchFx,10*60*1000); // refresh every 10 min
    return()=>clearInterval(t);
  },[]);

  const saveAIKeys=(gk,gmk,prim)=>{
    setItemSync('pm_groq_key',gk);
    setItemSync('pm_gemini_key',gmk);
    setItemSync('pm_primary_ai',prim);
    setGroqKey(gk); setGeminiKey(gmk); setPrimaryAI(prim);
    setShowAISetup(false);
  };
  const activePf=useMemo(()=>portfolios.find(p=>p.id===activeId)||portfolios[0],[portfolios,activeId]);
  const holdings=activePf?.holdings??[],targets=activePf?.targets??{};
  const setHoldings=fn=>setPortfolios(ps=>ps.map(p=>p.id===activeId?{...p,holdings:typeof fn==='function'?fn(p.holdings):fn}:p));
  const setTargets=fn=>setPortfolios(ps=>ps.map(p=>p.id===activeId?{...p,targets:typeof fn==='function'?fn(p.targets):fn}:p));
  const addPortfolio=()=>{const id=Date.now(),n=portfolios.length+1;setPortfolios(ps=>[...ps,{id,name:`Portfolio ${n}`,holdings:[],targets:{}}]);setActiveId(id);};
  const renamePortfolio=(id,name)=>setPortfolios(ps=>ps.map(p=>p.id===id?{...p,name}:p));
  const deletePortfolio=id=>{
    if(portfolios.length<=1)return;
    if(window.confirm("Are you sure you want to delete this entire portfolio? This action cannot be undone.")){
      const r=portfolios.filter(p=>p.id!==id);
      setPortfolios(r);
      if(activeId===id)setActiveId(r[0].id);
    }
  };
  const addHolding=h=>setHoldings(p=>[...p,h]);
  const removeHolding=id=>{
    if(window.confirm("Are you sure you want to remove this stock from your portfolio?")){
      setHoldings(p=>p.filter(h=>h.id!==id));
    }
  };
  const saveTarget=(id,val)=>setTargets(p=>val==null?Object.fromEntries(Object.entries(p).filter(([k])=>+k!==id)):{...p,[id]:val});
  const saveUnpledgedQty=(id,val)=>setHoldings(p=>p.map(h=>h.id===id?{...h,unpledgedQty:val}:h));
  const saveHoldingUpdates=(id,updates)=>setHoldings(p=>p.map(h=>h.id===id?{...h,...updates}:h));
  const importHoldings=rows=>{const nt={};const nh=rows.map(({analystTarget,...h})=>{if(analystTarget!=null)nt[h.id]=analystTarget;return h;});setHoldings(p=>[...p,...nh]);if(Object.keys(nt).length)setTargets(p=>({...p,...nt}));};
  useEffect(()=>{if(isLoaded)setItemSync('pm_portfolios',JSON.stringify(portfolios));},[portfolios,isLoaded]);
  useEffect(()=>{if(isLoaded)setItemSync('pm_activeId',JSON.stringify(activeId));},[activeId,isLoaded]);
  useEffect(()=>{if(isLoaded)setItemSync('pm_sidebar_collapsed',JSON.stringify(sidebarCollapsed));},[sidebarCollapsed,isLoaded]);
  useEffect(()=>{if(isLoaded)setItemSync('pm_right_sidebar_collapsed',JSON.stringify(rightSidebarCollapsed));},[rightSidebarCollapsed,isLoaded]);
  useEffect(()=>{if(isLoaded)setItemSync('pm_tweaks',JSON.stringify(tweaks));},[tweaks,isLoaded]);
  useEffect(()=>{if(isLoaded)setItemSync('pm_portfolio_history',JSON.stringify(history));},[history,isLoaded]);
  useEffect(()=>{if(isLoaded)setItemSync('pm_alerts',JSON.stringify(alerts));},[alerts,isLoaded]);
  useEffect(()=>{if(isLoaded)setItemSync('pm_nps',JSON.stringify(npsHoldings));},[npsHoldings,isLoaded]);
  useEffect(()=>{if(isLoaded)setItemSync('pm_nps_navs',JSON.stringify(navs));},[navs,isLoaded]);
  useEffect(()=>{if(isLoaded)setItemSync('pm_nps_growth',JSON.stringify(npsGrowth));},[npsGrowth,isLoaded]);
  useEffect(()=>{if(isLoaded)setItemSync('pm_gold',JSON.stringify(goldHoldings));},[goldHoldings,isLoaded]);
  useEffect(()=>{if(isLoaded)setItemSync('pm_gold_api_key',goldApiKey);},[goldApiKey,isLoaded]);
  useEffect(()=>{if(isLoaded)setItemSync('pm_mf',JSON.stringify(mfHoldings));},[mfHoldings,isLoaded]);
  useEffect(()=>{if(isLoaded)setItemSync('pm_ppf',JSON.stringify(ppfHoldings));},[ppfHoldings,isLoaded]);
  useEffect(()=>{if(isLoaded)setItemSync('pm_emergency',JSON.stringify(emergencyFund));},[emergencyFund,isLoaded]);
  useEffect(()=>{if(window.electronAPI?.onUpdateAvailable)window.electronAPI.onUpdateAvailable(()=>setUpdateAvail(true));},[]);
  const fetchPrices=useCallback(async()=>{
    const pFetch = async (url, options={}) => {
      if(window.electronAPI?.netFetch){
        try {
          const text = await window.electronAPI.netFetch(url, options);
          return text ? JSON.parse(text) : null;
        } catch { return null; }
      }
      try {
        const r = await fetch(url, options);
        return await r.json();
      } catch { return null; }
    };
    const allSymbols = Array.from(new Set(portfolios.flatMap(p => p.holdings.map(h => h.symbol))));
    if(!allSymbols.length) return; setLoading(true); setError(null); const out = {};
    
    await Promise.all(allSymbols.map(async symbol=>{
      try{
        const json = await pFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`);
        const meta=json?.chart?.result?.[0]?.meta;
        if(meta?.regularMarketPrice){
          out[symbol]={current:meta.regularMarketPrice,prev:meta.chartPreviousClose??meta.regularMarketPrice,currency:meta.currency??(isUS(symbol)?'USD':'INR')};
        }else out[symbol]=null;
      }catch{out[symbol]=null;}
    }));

    // Fetch Live Gold Rate
    try {
      let foundGold = false;
      if(goldApiKey) {
        // Option 1: GoldAPI.io
        const gapi = await pFetch(`https://www.goldapi.io/api/XAU/INR`, { headers: { 'x-access-token': goldApiKey } });
        if(gapi?.price_gram_24k) {
          out['GOLD_24K'] = { current: gapi.price_gram_24k, currency: 'INR' };
          out['GOLD_22K'] = { current: gapi.price_gram_22k || (gapi.price_gram_24k * 0.916), currency: 'INR' };
          out['PHYSICAL_GOLD'] = { current: gapi.price_gram_24k, currency: 'INR' };
          foundGold = true;
        }
      }
      
      if(!foundGold) {
        // Option 2: Scrape from Swarna (Highly accurate Indian retail rate)
        try {
          const html = await window.electronAPI.netFetch('https://shop.swarna.com/', { headers: { 'User-Agent': 'Mozilla/5.0' } });
          const m22 = html.match(/Gold 22 KT - ₹\s*([\d,]+)/);
          const m24 = html.match(/Gold 24 KT - ₹\s*([\d,]+)/);
          if(m22 && m22[1]) {
            const p22 = parseFloat(m22[1].replace(/,/g,''));
            const p24 = m24 ? parseFloat(m24[1].replace(/,/g,'')) : (p22 / 0.916);
            out['GOLD_22K'] = { current: p22, currency: 'INR' };
            out['GOLD_24K'] = { current: p24, currency: 'INR' };
            out['PHYSICAL_GOLD'] = { current: p24, currency: 'INR' };
            foundGold = true;
          }
        } catch(e) { console.error("Swarna scrape error", e); }
      }

      if(!foundGold) {
        // Option 3: Fallback to Yahoo Finance XAUINR=X
        const gjson = await pFetch(`https://query1.finance.yahoo.com/v8/finance/chart/XAUINR%3DX?interval=1d&range=1d`);
        const gmeta = gjson?.chart?.result?.[0]?.meta;
        if(gmeta?.regularMarketPrice) {
          const p24 = gmeta.regularMarketPrice / 31.1035;
          out['GOLD_24K'] = { current: p24, currency: 'INR' };
          out['GOLD_22K'] = { current: p24 * 0.916, currency: 'INR' };
          out['PHYSICAL_GOLD'] = { current: p24, currency: 'INR' };
        }
      }
    } catch(e) { console.error("Gold fetch error", e); }

    // Fetch Mutual Fund Prices
    const mfCodes = Array.from(new Set((mfHoldings||[]).map(h => h.schemeCode).filter(Boolean)));
    await Promise.all(mfCodes.map(async code => {
      try {
        const json = await pFetch(`https://api.mfapi.in/mf/${code}`);
        if(json?.data?.[0]?.nav) {
          out[`MF_${code}`] = { current: parseFloat(json.data[0].nav), currency: 'INR' };
        }
      } catch {}
    }));

    setPrices(prev=>{
      const merged={...prev};
      let anyNew=false;
      Object.keys(out).forEach(sym=>{
        if(JSON.stringify(out[sym])!==JSON.stringify(prev[sym])){
          merged[sym]=out[sym];
          anyNew=true;
        }
      });
      return anyNew ? merged : prev;
    });
    setLastUpdated(new Date());setLoading(false);
  },[portfolios, mfHoldings]);

  // Global background snapshot logic
  useEffect(() => {
    if(!isLoaded || !portfolios.length) return;
    
    // Aggregate total value across all portfolios + NPS
    let totalInrEquityVal = 0;
    let totalInrEquityInv = 0;
    let totalUsdEquityVal = 0;
    let totalUsdEquityInv = 0;

    portfolios.forEach(p => {
      p.holdings.forEach(h => {
        const pr = prices[h.symbol];
        if(!pr) return;
        const curVal = h.qty * pr.current;
        const invVal = h.qty * h.buyPrice;
        if(pr.currency === 'USD') {
          totalUsdEquityVal += curVal;
          totalUsdEquityInv += invVal;
        } else {
          totalInrEquityVal += curVal;
          totalInrEquityInv += invVal;
        }
      });
    });

    const totalInrVal = Math.round(totalInrEquityVal + (totalUsdEquityVal * (usdInr || 83.5)));
    const totalInrInv = Math.round(totalInrEquityInv + (totalUsdEquityInv * (usdInr || 83.5)));

    // Add NPS values
    const npsVal = (npsHoldings||[]).reduce((a,h)=>{
      const getNavKey=(pfm,s)=>pfm.split(' ')[0].toUpperCase() + '_' + s;
      const v = (h.e * (navs[getNavKey(h.pfm,'E')]||0)) + (h.c * (navs[getNavKey(h.pfm,'C')]||0)) + (h.g * (navs[getNavKey(h.pfm,'G')]||0));
      return a+v;
    },0);
    const npsInv = (npsHoldings||[]).reduce((a,h)=>a+(parseFloat(h.tInv)||0),0);
    
    // Add Gold values
    const goldPrice = prices['PHYSICAL_GOLD']?.current || 0;
    const totalGoldGrams = (goldHoldings||[]).reduce((a,h)=>a+(parseFloat(h.grams)||0),0);
    const goldVal = Math.round(totalGoldGrams * goldPrice * 1.03);
    const goldInv = (goldHoldings||[]).reduce((a,h)=>a+(parseFloat(h.invVal)||0),0);

    // Add Mutual Fund values
    const mfVal = (mfHoldings||[]).reduce((a,h)=>{
      const pr = prices[`MF_${h.schemeCode}`];
      return a + ((parseFloat(h.units)||0) * (pr?.current||0));
    },0);
    const mfInv = (mfHoldings||[]).reduce((a,h)=>a+(parseFloat(h.invVal)||0),0);

    // Add PPF values
    const ppfVal = (ppfHoldings||[]).reduce((a,h)=>a+(parseFloat(h.amount)||0),0);
    const ppfInv = (ppfHoldings||[]).reduce((a,h)=>a+(h.isInterest?0:(parseFloat(h.amount)||0)),0);

    // Add Emergency Fund values
    const efVal = (emergencyFund||[]).reduce((a,h)=>a+(parseFloat(h.amount)||0),0);
    const efInv = efVal;

    const finalInrVal = Math.round(totalInrVal + npsVal + goldVal + mfVal + ppfVal);
    const finalInrInv = Math.round(totalInrInv + npsInv + goldInv + mfInv + ppfInv);
    const today = new Date().toISOString().slice(0,10);

    setHistory(prev => {
      const existing = prev.find(p => p.date === today);
      if(existing) {
        const dVal = Math.abs(existing.inrVal - finalInrVal) / Math.max(existing.inrVal, 1);
        const dInv = Math.abs((existing.inrInv||0) - finalInrInv) / Math.max(existing.inrInv||1, 1);
        if(dVal < 0.0005 && dInv < 0.0005) return prev; 
        return prev.map(p => p.date === today ? { 
          ...p, 
          inrVal: finalInrVal, 
          inrInv: 8567549, // Forced baseline from user
          npsVal: Math.round(npsVal), 
          npsInv: Math.round(npsInv),
          goldVal: Math.round(goldVal), 
          goldInv: Math.round(goldInv),
          mfVal: Math.round(mfVal),
          mfInv: Math.round(mfInv),
          ppfVal: Math.round(ppfVal),
          ppfInv: Math.round(ppfInv),
          efVal: Math.round(efVal),
          efInv: Math.round(efInv),
          inrEquityVal: Math.round(totalInrEquityVal),
          inrEquityInv: Math.round(totalInrEquityInv),
          usdEquityVal: Math.round(totalUsdEquityVal),
          usdEquityInv: Math.round(totalUsdEquityInv)
        } : p);
      }
      return [...prev, { 
        date: today, 
        inrVal: finalInrVal, 
        inrInv: 8567549, // Forced baseline from user
        npsVal: Math.round(npsVal), 
        npsInv: Math.round(npsInv),
        goldVal: Math.round(goldVal), 
        goldInv: Math.round(goldInv),
        mfVal: Math.round(mfVal),
        mfInv: Math.round(mfInv),
        ppfVal: Math.round(ppfVal),
        ppfInv: Math.round(ppfInv),
        efVal: Math.round(efVal),
        efInv: Math.round(efInv),
        inrEquityVal: Math.round(totalInrEquityVal),
        inrEquityInv: Math.round(totalInrEquityInv),
        usdEquityVal: Math.round(totalUsdEquityVal),
        usdEquityInv: Math.round(totalUsdEquityInv)
      }].slice(-365);
    });
  }, [prices, npsHoldings, navs, usdInr, portfolios, isLoaded]);
  useEffect(()=>{
    fetchPrices();
    const ms=(tweaks.autoRefreshMins||5)*60*1000;
    const t=setInterval(fetchPrices,ms);
    return()=>clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[fetchPrices,tweaks.autoRefreshMins]);
  const fetchStockDetail=useCallback(async(symbol,range='3mo')=>{
    setStockDetails(prev=>({...prev,[symbol]:{...prev[symbol],loading:true,range}}));
    const pFetch = async (url, options={}) => {
      if(window.electronAPI?.netFetch){
        try {
          const text = await window.electronAPI.netFetch(url, options);
          return text ? JSON.parse(text) : null;
        } catch { return null; }
      }
      try {
        const r = await fetch(url, options);
        return await r.json();
      } catch { return null; }
    };

    try{
      // ── 1. Chart API — history + meta (52W, marketCap, volume) ──────────────
      const cj = await pFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}&includePrePost=false`);
      const result=cj?.chart?.result?.[0]||{};
      const meta=result.meta||{};
      const ts=result.timestamp||[],q=result.indicators?.quote?.[0]||{};
      const history=ts.map((t,i)=>({
        date:t*1000,open:q.open?.[i],high:q.high?.[i],low:q.low?.[i],close:q.close?.[i],volume:q.volume?.[i],
        change:i>0&&q.close?.[i-1]?((q.close[i]-q.close[i-1])/q.close[i-1])*100:0,
      })).filter(d=>d.close!=null);

      // ── 2. Fundamentals: try v10 quoteSummary → v7 quote → chart meta ─────────
      const n=v=>v==null?null:(typeof v==='object'&&'raw' in v?v.raw:v);
      let qd={};  // v7 quote data
      let qs={};  // v10 quoteSummary data

      // Try v10 quoteSummary
      for(const host of ['query1','query2']){
        const j = await pFetch(`https://${host}.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryDetail,defaultKeyStatistics,financialData,price`);
        const res=j?.quoteSummary?.result?.[0];
        if(res){qs=res;break;}
      }

      // Try v7 quote
      for(const host of ['query1','query2']){
        const j = await pFetch(`https://${host}.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&lang=en-US&region=US`);
        const res=j?.quoteResponse?.result?.[0];
        if(res?.symbol){qd=res;break;}
      }

      // ── 3. Tickertape fallback for Indian Stocks ───────────────────────────
      let ttData={};
      if(symbol.endsWith('.NS')||symbol.endsWith('.BO')){
        const sid=symbol.split('.')[0];
        const j = await pFetch(`https://api.tickertape.in/stocks/info/${sid}`);
        if(j?.success && j?.data) ttData=j.data;
      }

      // ── 4. Investing.com fallback (Best for both IN/US if Yahoo fails) ─────
      let invData = null;
      if (window.electronAPI?.scrapeInvesting) {
        // Only scrape if Yahoo is missing key fields
        if (!qs.summaryDetail?.trailingPE || !qs.defaultKeyStatistics?.trailingEps) {
          invData = await window.electronAPI.scrapeInvesting(symbol);
        }
      }

      // ── 5. Merge all sources — v10 wins for fundamentals ────────────────────
      const sd=qs.summaryDetail||{}, fd=qs.financialData||{}, ks=qs.defaultKeyStatistics||{}, pd=qs.price||{}, ttRatios=ttData.ratios||{};
      const betaVal=n(sd.beta)??n(ks.beta)??n(qd.beta)??n(qd.beta3Year)??n(meta.beta);
      const divYield=n(sd.dividendYield)??n(sd.trailingAnnualDividendYield)??n(qd.trailingAnnualDividendYield)??(ttRatios.divYield?ttRatios.divYield/100:null)??invData?.divYield;
      const summary={
        price:{
          marketCap:           n(pd.marketCap)??n(qd.marketCap)??n(meta.marketCap)??(ttRatios.marketCap?ttRatios.marketCap*1e7:null)??invData?.marketCap,
          regularMarketVolume: n(pd.regularMarketVolume)??n(qd.regularMarketVolume)??n(meta.regularMarketVolume),
          shortName:           pd.shortName??qd.shortName??meta.shortName,
          recommendationKey:   fd.recommendationKey??qd.recommendationKey,
          targetMeanPrice:     n(fd.targetMeanPrice)??n(qd.targetMeanPrice),
        },
        summaryDetail:{
          trailingPE:       n(sd.trailingPE)??n(qd.trailingPE)??n(ttRatios.ttmPe)??invData?.pe,
          fiftyTwoWeekHigh: n(sd.fiftyTwoWeekHigh)??n(qd.fiftyTwoWeekHigh)??n(meta.fiftyTwoWeekHigh),
          fiftyTwoWeekLow:  n(sd.fiftyTwoWeekLow)??n(qd.fiftyTwoWeekLow)??n(meta.fiftyTwoWeekLow),
          beta:             betaVal,
          dividendYield:    divYield,
        },
        defaultKeyStatistics:{
          trailingEps:             n(ks.trailingEps)??n(qd.epsTrailingTwelveMonths)??n(ttRatios.eps)??invData?.eps,
          numberOfAnalystOpinions: n(ks.numberOfAnalystOpinions)??n(qd.numberOfAnalystOpinions),
        },
        financialData:{
          recommendationKey:    fd.recommendationKey??qd.recommendationKey,
          targetMeanPrice:      n(fd.targetMeanPrice)??n(qd.targetMeanPrice),
          targetHighPrice:      n(fd.targetHighPrice),
          targetLowPrice:       n(fd.targetLowPrice),
          targetMeanPrice2:     n(fd.targetMeanPrice),
          numberOfAnalystOpinions: n(fd.numberOfAnalystOpinions),
        },
        recommendationTrend: qs.recommendationTrend||null,
      };

      setStockDetails(prev=>({...prev,[symbol]:{history,summary,loading:false,error:null,range}}));
    }catch(e){
      setStockDetails(prev=>({...prev,[symbol]:{history:[],summary:{},loading:false,error:'Failed to load data',range}}));
    }
  },[]);
  const fetchAIAnalysis=useCallback(async(symbol,holding,curPrice,currency,provider)=>{
    const prim=provider||primaryAI;
    if(!groqKey&&!geminiKey)return;
    setAiAnalyses(prev=>({...prev,[symbol]:{...prev[symbol],loading:true,error:null}}));
    const cur=currency==='INR'?'₹':'$';
    const pos=holding
      ?`The user holds ${holding.qty} shares bought at ${cur}${holding.buyPrice}. Current price: ${cur}${curPrice?.toFixed(2)??'unknown'}.`
      :'The user does not hold this stock.';
    const prompt=`You are a concise financial analyst. Analyse ${symbol} (${holding?.name||symbol}).
${pos}
Respond ONLY as a JSON object with these keys:
{"overview":"2-sentence description","sentiment":"Bullish|Neutral|Bearish","performance":"2-sentence recent performance","opportunities":["pt1","pt2","pt3"],"risks":["r1","r2","r3"],"positionComment":"1 sentence on user position or null","disclaimer":"Not financial advice."}`;
    try{
      const {text,usedProvider}=await callAI(groqKey,geminiKey,prim,prompt);
      const data=extractJSON(text);
      if(data) setAiAnalyses(prev=>({...prev,[symbol]:{loading:false,data,error:null,provider:usedProvider}}));
      else setAiAnalyses(prev=>({...prev,[symbol]:{loading:false,data:null,error:'Could not parse AI response.',provider:usedProvider}}));
    }catch(e){
      setAiAnalyses(prev=>({...prev,[symbol]:{loading:false,data:null,error:e.message,provider:null}}));
    }
  },[groqKey,geminiKey,primaryAI]);

  const openStockTab=useCallback((symbol)=>{
    if(!openStockTabs.find(t=>t.symbol===symbol))setOpenStockTabs(prev=>[...prev,{symbol}]);
    setMainTab(`stock:${symbol}`);
    const ex=stockDetails[symbol];if(!ex||ex.error||!ex.history?.length)fetchStockDetail(symbol,'3mo');
  },[openStockTabs,stockDetails,fetchStockDetail]);
  const closeStockTab=useCallback((symbol)=>{setOpenStockTabs(prev=>prev.filter(t=>t.symbol!==symbol));if(mainTab===`stock:${symbol}`)setMainTab('IN');},[mainTab]);
  const allRows=useMemo(()=>{
    return portfolios.flatMap(p=>p.holdings.map(h=>{
      const pr=prices[h.symbol],cur=pr?.currency??(isUS(h.symbol)?'USD':'INR'),cp=pr?.current??null;
      const inv=parseFloat((h.buyPrice*h.qty).toFixed(8)),cv=cp!=null?parseFloat((cp*h.qty).toFixed(2)):null;
      return{...h,currency:cur,curPrice:cp,invested:inv,curValue:cv,gain:cv?cv-inv:null,pfName:p.name};
    }));
  },[portfolios,prices]);

  const uniqueHoldings=useMemo(()=>{
    const map=new Map();
    allRows.forEach(h=>{ if(!map.has(h.symbol)) map.set(h.symbol, h); });
    return Array.from(map.values());
  },[allRows]);

  const rows=useMemo(()=>holdings.map(h=>{const p=prices[h.symbol],cur=p?.currency??(isUS(h.symbol)?'USD':'INR'),cp=p?.current??null;const inv=parseFloat((h.buyPrice*h.qty).toFixed(8)),cv=cp!=null?parseFloat((cp*h.qty).toFixed(2)):null;const g=cv!=null?cv-inv:null,gp=g!=null?(g/inv)*100:null,dc=p?((p.current-p.prev)/p.prev)*100:null,dp=dc!=null&&cv!=null?(dc/100)*cv:null;return{...h,currency:cur,curPrice:cp,invested:inv,curValue:cv,gain:g,gainPct:gp,dayChange:dc,dayPL:dp};}),[holdings,prices]);
  const inRows=useMemo(()=>rows.filter(r=>r.currency==='INR'),[rows]);
  const usRows=useMemo(()=>rows.filter(r=>r.currency==='USD'),[rows]);
  const inPie=useMemo(()=>inRows.map(r=>({name:short(r.symbol),value:r.curValue??r.invested})),[inRows]);
  const usPie=useMemo(()=>usRows.map(r=>({name:short(r.symbol),value:r.curValue??r.invested})),[usRows]);
  const invIN=inRows.reduce((s,r)=>s+r.invested,0),invUS=usRows.reduce((s,r)=>s+r.invested,0);
  const gainIN=inRows.reduce((s,r)=>s+(r.gain??0),0),gainUS=usRows.reduce((s,r)=>s+(r.gain??0),0);
  const dayIN=inRows.reduce((s,r)=>s+(r.dayPL??0),0),dayUS=usRows.reduce((s,r)=>s+(r.dayPL??0),0);
  const totalPortInr=inRows.reduce((s,r)=>s+(r.curValue??r.invested),0),totalPortUsd=usRows.reduce((s,r)=>s+(r.curValue??r.invested),0);
  const globalInrEquity = allRows.filter(r=>r.currency==='INR').reduce((s,r)=>s+(r.curValue??r.invested),0);
  const globalUsdEquity = allRows.filter(r=>r.currency==='USD').reduce((s,r)=>s+(r.curValue??r.invested),0);
  const globalGainIN = allRows.filter(r=>r.currency==='INR').reduce((s,r)=>s+(r.gain??0),0);
  const globalDayIN = allRows.filter(r=>r.currency==='INR').reduce((s,r)=>s+(r.dayPL??0),0);
  const globalGainUS = allRows.filter(r=>r.currency==='USD').reduce((s,r)=>s+(r.gain??0),0);
  const globalDayUS = allRows.filter(r=>r.currency==='USD').reduce((s,r)=>s+(r.dayPL??0),0);

  // Total Portfolio Analytics
  const npsGain = (npsHoldings||[]).reduce((a,h)=>{
    const getNavKey=(pfm,s)=>pfm.split(' ')[0].toUpperCase() + '_' + s;
    const v = (h.e * (navs[getNavKey(h.pfm,'E')]||0)) + (h.c * (navs[getNavKey(h.pfm,'C')]||0)) + (h.g * (navs[getNavKey(h.pfm,'G')]||0));
    return a + (v - (h.tInv||0));
  }, 0);
  const goldPrice = prices['PHYSICAL_GOLD']?.current || 0;
  const goldGain = (goldHoldings||[]).reduce((a,h)=>{
    const cur = (h.grams * goldPrice * 1.03);
    return a + (cur - (h.invVal||0));
  }, 0);
  const totalInvBaseline = 8567549; // Fixed baseline as requested
  const mfGain = (mfHoldings||[]).reduce((a,h)=>{
    const pr = prices[`MF_${h.schemeCode}`]?.current || 0;
    return a + ((h.units * pr) - (h.invVal||0));
  }, 0);
  const totalActualGain = globalGainIN + (globalGainUS * (usdInr||83.5)) + npsGain + goldGain + mfGain;
  const totalPortfolioGain = totalActualGain;
  // Override totalGain if needed, but we'll use the calculated one
  const activeStock=mainTab.startsWith('stock:')?mainTab.slice(6):null;
  const sharedProps={fetchPrices,loading,error,lastUpdated,onSaveUnpledged:saveUnpledgedQty,onSaveUpdates:saveHoldingUpdates,onRemove:removeHolding,compact:tweaks.compactRows,addHolding,T};

  const SidebarContent=({sRows,pie,currency,usdInr,invAmt,totalAmt,gain,dayGain,offset})=>{
    return(
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {/* Portfolio summary */}
        <div style={{background:T.surface2,borderRadius:T.r,border:`1px solid ${T.border}`,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:3,height:16,background:T.accent,borderRadius:2}}/>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>{activePf?.name}</span>
          </div>
          <div style={{padding:'8px 16px 12px'}}>
            {[
              {l:'Holdings',v:`${sRows.length} stocks`},
              {l:'Winners / Losers',v:`${sRows.filter(r=>(r.gain??0)>0).length} / ${sRows.filter(r=>(r.gain??0)<0).length}`},
              null,
              {l:'Invested',v:fmt(invAmt,currency)},
              {l:'Current Value',v:fmt(totalAmt,currency)},
              {l:'Total P&L',v:`${gain>=0?'+':'−'}${fmt(Math.abs(gain),currency)}`,vc:gColor(gain,T),sub:currency==='USD'&&usdInr?`≈ ${gain>=0?'+':'−'}₹${Math.abs(gain*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}`:''},
              {l:"Today's P&L",v:`${dayGain>=0?'+':'−'}${fmt(Math.abs(dayGain),currency)}`,vc:gColor(dayGain,T),sub:currency==='USD'&&usdInr?`≈ ${dayGain>=0?'+':'−'}₹${Math.abs(dayGain*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}`:''},
            ].map((row,i)=>row===null?<div key={i} style={{height:1,background:T.border,margin:'8px 0'}}/>
              :<div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'5px 0',fontSize:12,borderBottom:`1px solid ${T.border}`}}>
                <span style={{color:T.text3}}>{row.l}</span>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:600,color:row.vc||T.text}}>{row.v}</div>
                  {row.sub&&<div style={{fontSize:10,color:row.vc||T.text3,opacity:.7}}>{row.sub}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
        {currency==='USD'&&usdInr&&(
          <div style={{background:T.surface2,borderRadius:T.r,border:`1px solid ${T.border}`,padding:'8px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:11,color:T.text3,fontWeight:600}}>💱 USD/INR</span>
            <span style={{fontSize:12,fontWeight:700,color:T.text}}>₹{usdInr.toFixed(2)}</span>
          </div>
        )}
        {pie.length>0&&<DonutChart T={T} title="Allocation" data={pie} currency={currency} offset={offset}/>}
        {tweaks.showCharts&&sRows.length>0&&<PLBarChart rows={sRows} currency={currency} T={T}/>}
      </div>
    );
  };

  // Left sidebar nav items
  const NAV=[
    {id:'IN',   label:'Indian Equity',  icon:<Ic.India/>, flag:'💹', color:T.inColor},
    {id:'US',   label:'US Equity',      icon:<Ic.US/>,    flag:'🌐', color:T.usColor},
    {id:'MF',   label:'Mutual Funds',   icon:'📦',       flag:'📦', color:'#10b981'},
    {id:'NPS',  label:'NPS Portfolio',  icon:'🛡️',       flag:'🛡️', color:T.accent},
    {id:'PPF',  label:'PPF Tracker',    icon:'🏦',       flag:'🏦', color:'#f59e0b'},
    {id:'GOLD', label:'Physical Gold',  icon:'🟡',       flag:'🟡', color:'#FFD700'},
    {id:'EF',   label:'Emergency Fund', icon:'🆘',       flag:'🆘', color:'#ef4444'},
  ];
  const MOD_NAV=[
    {id:'watchlist', label:'Watchlist',  icon:'👁', color:'#a855f7'},
    {id:'notes',     label:'Notes',    icon:'📝', color:'#10b981'},
    {id:'alerts',    label:'Alerts',   icon:'🔔', color:'#ef4444'},
    {id:'sectors',   label:'Sectors',  icon:'🏭', color:'#6366f1'},
    {id:'news',      label:'News',     icon:'📰', color:'#8b5cf6'},

    {id:'history',   label:'Asset Performance',  icon:'📈', color:'#f97316'},
  ];

  if(!isLoaded) return (
    <div style={{height:'100vh',background:T.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:24}}>
      <img src="./logo.png" style={{width:120,height:120,borderRadius:24,boxShadow:`0 0 40px ${T.accent}30`,animation:'pulse 2s infinite'}} alt="Logo"/>
      <div style={{color:T.accent,fontSize:20,fontWeight:700,fontFamily:'Orbitron, sans-serif',letterSpacing:'.1em',textShadow:`0 0 20px ${T.accent}60`}}>ORBITRON PORTFOLIO...</div>
    </div>
  );

  return(
    <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',background:T.bg,height:'100vh',display:'flex',flexDirection:'column',color:T.text,overflow:'hidden'}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-thumb{background:${T.surface4};border-radius:3px}
        ::-webkit-scrollbar-track{background:transparent}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
        input[type=range]{width:100%;accent-color:${T.accent}}
        button:disabled{opacity:.35;cursor:not-allowed!important}
      `}</style>

      {/* ── Title Bar ── */}
      <div className="title-bar" style={{background:T.sidebar,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px',borderBottom:`1px solid ${T.border}`,WebkitAppRegion:isCapacitor?'none':'drag',position:'relative',zIndex:100}}>
        <div className="title-bar-logo" style={{display:'flex',alignItems:'center',gap:12,WebkitAppRegion:'no-drag'}}>
          <button onClick={()=>setSidebarCollapsed(v=>!v)} style={{background:'none',border:'none',color:T.text3,cursor:'pointer',padding:4,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:4,transition:'all .1s'}} onMouseEnter={e=>e.currentTarget.style.color=T.accent} onMouseLeave={e=>e.currentTarget.style.color=T.text3}>
            <Ic.Menu/>
          </button>
          <div style={{width:28,height:28,borderRadius:6,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:`0 0 10px ${T.accent}40`,background:T.surface4}}>
            <img src="./logo.png" style={{width:'100%',height:'100%',objectFit:'cover'}} alt="P"/>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:T.text,letterSpacing:'-.01em'}}>Portfolio Manager Pro</div>
            <div style={{fontSize:10,color:T.text3,marginTop:1}}>Arun Verma · v6.0.0</div>
          </div>
        </div>

        {/* P&L pills */}
        <div className="pnl-pills" style={{display:'flex',gap:10,alignItems:'center',WebkitAppRegion:'no-drag'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 12px',background:T.surface2,borderRadius:8,border:`1px solid ${T.accent}`,boxShadow:`0 0 10px ${T.accent}20`}}>
            <span style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase',letterSpacing:'.05em'}}>Total P&L</span>
            <span style={{fontSize:14,fontWeight:800,color:gColor(totalPortfolioGain,T)}}>{totalPortfolioGain>=0?'+':'−'}₹{Math.abs(totalPortfolioGain).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
          </div>
          {(globalInrEquity > 0) && <div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 12px',background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`}}>
            <span style={{fontSize:12}}>🇮🇳</span>
            <span style={{fontSize:13,fontWeight:700,color:gColor(globalGainIN,T)}}>{globalGainIN>=0?'+':'−'}₹{Math.abs(globalGainIN).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
            <div style={{width:1,height:14,background:T.border}}/>
            <span style={{fontSize:11,color:gColor(globalDayIN,T)}}>{globalDayIN>=0?'+':'−'}₹{Math.abs(globalDayIN).toLocaleString('en-IN',{maximumFractionDigits:0})} today</span>
          </div>}
          {(globalUsdEquity > 0) && <div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 12px',background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`}}>
            <span style={{fontSize:12}}>🇺🇸</span>
            <div style={{display:'flex',flexDirection:'column',gap:1}}>
              <span style={{fontSize:13,fontWeight:700,color:gColor(globalGainUS,T)}}>{globalGainUS>=0?'+':'−'}${Math.abs(globalGainUS).toLocaleString('en-US',{maximumFractionDigits:0})}</span>
              {usdInr&&<span style={{fontSize:9,color:gColor(globalGainUS,T),opacity:.75}}>≈ {globalGainUS>=0?'+':'−'}₹{Math.abs(globalGainUS*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>}
            </div>
            <div style={{width:1,height:18,background:T.border}}/>
            <div style={{display:'flex',flexDirection:'column',gap:1}}>
              <span style={{fontSize:11,color:gColor(globalDayUS,T)}}>{globalDayUS>=0?'+':'−'}${Math.abs(globalDayUS).toLocaleString('en-US',{maximumFractionDigits:0})} today</span>
              {usdInr&&<span style={{fontSize:9,color:gColor(globalDayUS,T),opacity:.75}}>≈ {globalDayUS>=0?'+':'−'}₹{Math.abs(globalDayUS*usdInr).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>}
            </div>
          </div>}
        </div>

        {/* Controls */}
        <div className="title-bar-controls" style={{display:'flex',gap:6,alignItems:'center',WebkitAppRegion:'no-drag'}}>
          {updateAvail&&<NvBtn onClick={()=>window.electronAPI?.installUpdate()} variant="primary" T={T}><Ic.Update/> Update Ready</NvBtn>}
          <button onClick={()=>setTweaks(p=>({...p,darkMode:!p.darkMode}))} style={{padding:'7px 8px',borderRadius:6,border:`1px solid ${T.border}`,background:'transparent',color:T.text3,cursor:'pointer',display:'flex',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}>
            {tweaks.darkMode?<Ic.Sun/>:<Ic.Moon/>}
          </button>
          <button onClick={()=>setShowSettings(v=>!v)} style={{padding:'7px 8px',borderRadius:6,border:`1px solid ${showSettings?T.accent:T.border}`,background:showSettings?T.accentBg:'transparent',color:showSettings?T.accent:T.text3,cursor:'pointer',display:'flex',transition:'all .1s'}}>
            <Ic.Settings/>
          </button>
          <button onClick={()=>setRightSidebarCollapsed(v=>!v)} style={{padding:'7px 8px',borderRadius:6,border:`1px solid ${T.border}`,background:'transparent',color:T.text3,cursor:'pointer',display:'flex',transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}>
            <Ic.Menu/>
          </button>
          <div style={{display:isElectron?'flex':'none',marginLeft:4,gap:1}}>
            {[{icon:<Ic.Minimize size={14}/>,fn:()=>window.electronAPI?.minimize(),d:false},{icon:<Ic.Maximize size={14}/>,fn:()=>window.electronAPI?.maximize(),d:false},{icon:<Ic.X size={14}/>,fn:()=>window.electronAPI?.close(),d:true}].map(({icon,fn,d},i)=>(
              <button key={i} onClick={fn} style={{width:32,height:32,background:'transparent',border:'none',cursor:'pointer',color:T.text3,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:6,transition:'all .1s'}} onMouseEnter={e=>{e.currentTarget.style.background=d?'rgba(244,67,54,.2)':T.surface3;e.currentTarget.style.color=d?T.danger:T.text;}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=T.text3;}}>{icon}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body: Left Nav + Content ── */}
      <div className="main-container" style={{flex:1,overflow:'hidden',display:'flex',minHeight:0}}>

        {/* Left Sidebar */}
        <div style={{width:sidebarCollapsed?0:152,background:T.sidebar,borderRight:sidebarCollapsed?'none':`1px solid ${T.border}`,display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden',transition:'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)'}}>
          <div style={{width:152,display:'flex',flexDirection:'column',height:'100%',overflowY:'auto'}}>
            <div style={{padding:'16px 12px 8px',fontSize:10,fontWeight:700,color:T.text3,textTransform:'uppercase',letterSpacing:'.08em'}}>Portfolios</div>
          {/* Main nav: IN | US */}
          {NAV.map(nav=>{
            const active=mainTab===nav.id||mainTab.startsWith('stock:');
            const isActive=!activeModule&&mainTab===nav.id;
            return(
              <button key={nav.id} onClick={()=>{setMainTab(nav.id);setActiveModule(null);}} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:isActive?T.accentBg:'transparent',border:'none',borderLeft:isActive?`3px solid ${T.accent}`:'3px solid transparent',cursor:'pointer',width:'100%',textAlign:'left',color:isActive?T.accent:T.text2,transition:'all .15s',marginBottom:2}}>
                <span style={{fontSize:15}}>{nav.flag}</span>
                <span style={{fontSize:13,fontWeight:isActive?600:400}}>{nav.label}</span>
              </button>
            );
          })}
          {/* Module nav */}
          <div style={{height:1,background:T.border,margin:'8px 12px 4px'}}/>
          <div style={{padding:'8px 12px 4px',fontSize:10,fontWeight:700,color:T.text3,textTransform:'uppercase',letterSpacing:'.08em'}}>Tools</div>
          {MOD_NAV.map(mod=>{
            const isA=activeModule===mod.id;
            return(
              <div key={mod.id} style={{position:'relative'}}>
                <button onClick={()=>{setActiveModule(isA?null:mod.id);}} style={{width:'100%',display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'12px 4px',background:isA?T.accentBg:'transparent',border:'none',borderRadius:8,color:isA?T.accent:T.text3,cursor:'pointer',transition:'all .15s',position:'relative'}} onMouseEnter={e=>{if(!isA)e.currentTarget.style.background=T.surface4;}} onMouseLeave={e=>{if(!isA)e.currentTarget.style.background='transparent';}}>
                  <span style={{fontSize:14}}>{mod.icon}</span>
                  <span style={{fontSize:12,fontWeight:isA?600:400}}>{mod.label}</span>
                </button>
                {isA&&<button onClick={(e)=>{e.stopPropagation();setActiveModule(null);}} style={{position:'absolute',top:4,right:4,background:T.surface4,border:`1px solid ${T.accent}`,color:T.accent,cursor:'pointer',padding:4,display:'flex',borderRadius:6,boxShadow:'0 2px 8px rgba(0,0,0,0.2)',zIndex:10}} onMouseEnter={e=>e.currentTarget.style.background=T.accentBg} onMouseLeave={e=>e.currentTarget.style.background=T.surface4}><Ic.X size={14}/></button>}
              </div>
            );
          })}
          <div style={{height:1,background:T.border,margin:'4px 12px 8px'}}/>

          {/* Stock tabs in sidebar */}
          {openStockTabs.length>0&&<>
            <div style={{padding:'12px 12px 6px',fontSize:10,fontWeight:700,color:T.text3,textTransform:'uppercase',letterSpacing:'.08em',marginTop:8}}>Open Stocks</div>
            {openStockTabs.map(t=>{const tabId=`stock:${t.symbol}`,isA=mainTab===tabId,color=isUS(t.symbol)?T.usColor:T.inColor;return(
              <div key={t.symbol} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',background:isA?`${color}15`:'transparent',borderLeft:isA?`3px solid ${color}`:'3px solid transparent',transition:'all .15s',marginBottom:2}}>
                <button onClick={()=>setMainTab(tabId)} style={{background:'none',border:'none',cursor:'pointer',color:isA?color:T.text3,fontSize:12,fontWeight:isA?700:400,flex:1,textAlign:'left',padding:0}}>{short(t.symbol)}</button>
                <button onClick={()=>closeStockTab(t.symbol)} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:'1px 2px',display:'flex',transition:'color .1s'}} onMouseEnter={e=>e.currentTarget.style.color=T.danger} onMouseLeave={e=>e.currentTarget.style.color=T.text3}><Ic.X/></button>
              </div>
            );})}
          </>}
          {/* Bottom settings shortcut */}
          <div style={{marginTop:'auto',padding:'12px',borderTop:`1px solid ${T.border}`}}>
            <button onClick={()=>setShowSettings(v=>!v)} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:6,background:showSettings?T.accentBg:'transparent',border:'none',cursor:'pointer',width:'100%',color:showSettings?T.accent:T.text3,transition:'all .15s',fontSize:12}}>
              <Ic.Settings/> Settings
            </button>
            <div style={{fontSize:9,color:T.text3,textAlign:'center',marginTop:8,letterSpacing:'.05em',opacity:0.6}}>VERSION 6.0.0</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column',minHeight:0}}>
          <Suspense fallback={<div style={{padding:40,color:T.text3}}>Loading module...</div>}>
            {activeModule==='watchlist'&&<WatchlistModule T={T} usdInr={usdInr} onClose={()=>setActiveModule(null)}/>}
            {activeModule==='notes'&&<NotesModule T={T} holdings={holdings} onClose={()=>setActiveModule(null)}/>}
            {activeModule==='alerts'&&<AlertsModule T={T} prices={prices} holdings={uniqueHoldings} alerts={alerts} setAlerts={setAlerts} onClose={()=>setActiveModule(null)}/>}
            {activeModule==='sectors'&&<SectorModule T={T} rows={allRows} prices={prices} usdInr={usdInr} onClose={()=>setActiveModule(null)}/>}
            {activeModule==='news'&&<NewsModule T={T} holdings={uniqueHoldings} onClose={()=>setActiveModule(null)}/>}

            {activeModule==='history'&&<HistoryModule T={T} history={history} setHistory={setHistory} onClose={()=>setActiveModule(null)}/>}
          </Suspense>
          {!activeModule&&activeStock?(
            <StockDetailView symbol={activeStock} holding={rows.find(r=>r.symbol===activeStock)} detail={stockDetails[activeStock]} prices={prices} targets={targets} onSaveTarget={saveTarget} onRefresh={()=>fetchStockDetail(activeStock,stockDetails[activeStock]?.range||'3mo')} onRangeChange={(sym,range)=>fetchStockDetail(sym,range)} groqKey={groqKey} geminiKey={geminiKey} primaryAI={primaryAI} aiAnalysis={aiAnalyses[activeStock]} onAIRefresh={(prov)=>{const r=rows.find(r=>r.symbol===activeStock);fetchAIAnalysis(activeStock,r,r?.curPrice,r?.currency,prov);}} T={T}/>
          ):(!activeModule&&(
            <>
              {/* Portfolio sub-tabs */}
              <PortfolioTabs portfolios={portfolios} activeId={activeId} onSwitch={setActiveId} onAdd={addPortfolio} onRename={renamePortfolio} onDelete={deletePortfolio} T={T}/>
              {/* Main grid */}
              <div className="main-grid" style={{flex:1,overflow:'hidden',display:'grid',gridTemplateColumns:rightSidebarCollapsed?'1fr 0px':'minmax(0,1fr) clamp(220px,20vw,280px)',gap:0,transition:'grid-template-columns 0.25s cubic-bezier(0.4, 0, 0.2, 1)'}}>
                <div style={{overflowY:'auto',padding:20}}>
                  {mainTab==='IN'&&<Section title="Indian Equity" flag="🇮🇳" accent={T.inColor} rows={inRows} currency="INR" onImportCSV={()=>setImportModal('IN')} onRowClick={openStockTab} {...sharedProps}/>}
                  {mainTab==='US'&&<Section title="US Equity" flag="🇺🇸" accent={T.usColor} rows={usRows} currency="USD" usdInr={usdInr} onImportCSV={()=>setImportModal('US')} onRowClick={openStockTab} {...sharedProps}/>}
                  {mainTab==='NPS'&&<Suspense fallback={<div style={{padding:40,color:T.text3}}>Loading NPS...</div>}><NPSModule T={T} holdings={npsHoldings} setHoldings={setNpsHoldings} navs={navs} setNavs={setNavs} growth={npsGrowth} setGrowth={setNpsGrowth} onClose={()=>setMainTab('IN')}/></Suspense>}
                  {mainTab==='GOLD'&&<Suspense fallback={<div style={{padding:40,color:T.text3}}>Loading Gold...</div>}><GoldModule T={T} holdings={goldHoldings} setHoldings={setGoldHoldings} prices={prices} onClose={()=>setMainTab('IN')}/></Suspense>}
                  {mainTab==='MF'&&<Suspense fallback={<div style={{padding:40,color:T.text3}}>Loading Mutual Funds...</div>}><MFModule T={T} holdings={mfHoldings} setHoldings={setMfHoldings} prices={prices} onClose={()=>setMainTab('IN')}/></Suspense>}
                  {mainTab==='PPF'&&<Suspense fallback={<div style={{padding:40,color:T.text3}}>Loading PPF...</div>}><PPFModule T={T} holdings={ppfHoldings} setHoldings={setPpfHoldings} onClose={()=>setMainTab('IN')}/></Suspense>}
                  {mainTab==='EF'&&<Suspense fallback={<div style={{padding:40,color:T.text3}}>Loading Emergency Fund...</div>}><EFModule T={T} holdings={emergencyFund} setHoldings={setEmergencyFund} onClose={()=>setMainTab('IN')}/></Suspense>}
                </div>
                <div className="right-sidebar" style={{overflowY:'auto',padding:rightSidebarCollapsed?0:'20px 16px 20px 0',borderLeft:rightSidebarCollapsed?'none':`1px solid ${T.border}`,opacity:rightSidebarCollapsed?0:1,transition:'opacity 0.2s'}}>
                  <div style={{padding:'0 0 0 16px'}}>
                    {mainTab==='IN'&&<SidebarContent sRows={inRows} pie={inPie} currency="INR" invAmt={invIN} totalAmt={totalPortInr} gain={gainIN} dayGain={dayIN} offset={0}/>}
                    {mainTab==='US'&&<SidebarContent sRows={usRows} pie={usPie} currency="USD" usdInr={usdInr} invAmt={invUS} totalAmt={totalPortUsd} gain={gainUS} dayGain={dayUS} offset={6}/>}
                    {mainTab==='MF'&&<SidebarContent sRows={mfHoldings.map(h=>({symbol:h.schemeCode,gain:(h.units*(prices[`MF_${h.schemeCode}`]?.current||0))-h.invVal}))} pie={mfHoldings.map(h=>({name:h.name,value:h.units*(prices[`MF_${h.schemeCode}`]?.current||0)}))} currency="INR" invAmt={mfHoldings.reduce((a,h)=>a+h.invVal,0)} totalAmt={mfHoldings.reduce((a,h)=>a+h.units*(prices[`MF_${h.schemeCode}`]?.current||0),0)} gain={mfGain} dayGain={0} offset={2}/>}
                    {mainTab==='PPF'&&<div style={{padding:16,background:T.surface2,borderRadius:12,border:`1px solid ${T.border}`}}><div style={{fontSize:11,color:T.text3,fontWeight:700,textTransform:'uppercase',marginBottom:8}}>PPF Overview</div><div style={{fontSize:20,fontWeight:800,color:'#f59e0b'}}>₹{ppfHoldings.reduce((a,h)=>a+h.amount,0).toLocaleString('en-IN')}</div><div style={{fontSize:11,color:T.text3,marginTop:4}}>{ppfHoldings.length} Contributions</div></div>}
                    {mainTab==='EF'&&<div style={{padding:16,background:T.surface2,borderRadius:12,border:`1px solid ${T.border}`}}><div style={{fontSize:11,color:T.text3,fontWeight:700,textTransform:'uppercase',marginBottom:8}}>EF Overview</div><div style={{fontSize:20,fontWeight:800,color:'#ef4444'}}>₹{emergencyFund.reduce((a,h)=>a+h.amount,0).toLocaleString('en-IN')}</div><div style={{fontSize:11,color:T.text3,marginTop:4}}>{emergencyFund.length} Sources</div></div>}
                  </div>
                </div>
              </div>
            </>
          ))}
        </div>
      </div>

      {showAISetup&&<AISetupModal onSave={saveAIKeys} T={T}/> }
      {showSettings&&<SettingsPanel tweaks={tweaks} onUpdate={(k,v)=>setTweaks(p=>({...p,[k]:v}))} onClose={()=>setShowSettings(false)} groqKey={groqKey} geminiKey={geminiKey} primaryAI={primaryAI} onSaveAIKeys={saveAIKeys} goldApiKey={goldApiKey} setGoldApiKey={setGoldApiKey} T={T}/>}
      {importModal&&<CSVImportModal market={importModal} onImport={importHoldings} onClose={()=>setImportModal(null)} T={T}/>}
      {isMobile && <BottomNav activeId={mainTab} activeModule={activeModule} onSwitch={(id) => {if(id==='IN'||id==='US'){setMainTab(id);setActiveModule(null);}else{setActiveModule(id);}}} T={T} NAV={NAV} MOD_NAV={MOD_NAV}/>}

      {isLocked && (
        <div style={{position:'fixed',inset:0,background:T.bg,zIndex:10000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{width:300,textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:20}}>🔒</div>
            <div style={{fontSize:18,fontWeight:700,color:T.text,marginBottom:8}}>Portfolio Manager Pro</div>
            <div style={{fontSize:13,color:T.text3,marginBottom:24}}>Enter your 4-digit PIN to continue</div>
            <div style={{display:'flex',justifyContent:'center',gap:12,marginBottom:32}}>
              {[0,1,2,3].map(i=>(
                <div key={i} style={{width:16,height:16,borderRadius:8,background:pinInput.length>i?T.accent:T.surface4,border:`1px solid ${T.border}`}}/>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,maxWidth:240,margin:'0 auto'}}>
              {[1,2,3,4,5,6,7,8,9].map(n=>(
                <button key={n} onClick={()=>{
                  if(pinInput.length<4){
                    const ni = pinInput + n;
                    setPinInput(ni);
                    if(ni === tweaks.pin) { setIsLocked(false); setPinInput(''); }
                    else if(ni.length===4) { alert("Incorrect PIN"); setPinInput(''); }
                  }
                }} style={{aspectRatio:'1/1',borderRadius:12,background:T.surface2,border:`1px solid ${T.border}`,color:T.text,fontSize:20,fontWeight:700,cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background=T.surface3} onMouseLeave={e=>e.currentTarget.style.background=T.surface2}>{n}</button>
              ))}
              <div/>
              <button onClick={()=>{
                 if(pinInput.length<4){
                   const ni = pinInput + '0';
                   setPinInput(ni);
                   if(ni === tweaks.pin) { setIsLocked(false); setPinInput(''); }
                   else if(ni.length===4) { alert("Incorrect PIN"); setPinInput(''); }
                 }
              }} style={{aspectRatio:'1/1',borderRadius:12,background:T.surface2,border:`1px solid ${T.border}`,color:T.text,fontSize:20,fontWeight:700,cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background=T.surface3} onMouseLeave={e=>e.currentTarget.style.background=T.surface2}>0</button>
              <button onClick={()=>setPinInput(p=>p.slice(0,-1))} style={{aspectRatio:'1/1',borderRadius:12,background:T.surface2,border:`1px solid ${T.border}`,color:T.text3,fontSize:14,cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background=T.surface3} onMouseLeave={e=>e.currentTarget.style.background=T.surface2}>⌫</button>
            </div>
          </div>
        </div>
      )}

      {isClosing && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(8px)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:T.surface,border:`1px solid ${T.accent}40`,borderRadius:16,padding:32,maxWidth:440,width:'100%',textAlign:'center',boxShadow:`0 24px 64px rgba(0,0,0,0.6), 0 0 40px ${T.accent}15`}}>
            <div style={{width:64,height:64,background:T.accentBg,borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',color:T.accent,fontSize:28}}>💾</div>
            <h2 style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:12}}>Save Backup before Exit?</h2>
            <p style={{fontSize:14,color:T.text3,lineHeight:1.6,marginBottom:24}}>To prevent data loss, your current portfolio state will be saved as a CSV file in your Portfolio folder.</p>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <button onClick={() => handleFinalExit(true)} style={{width:'100%',padding:'14px',background:T.accent,border:'none',borderRadius:8,color:'#000',fontWeight:700,cursor:'pointer',fontSize:14,transition:'all .15s'}} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.02)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>Save CSV & Exit</button>
              <button onClick={() => handleFinalExit(false)} style={{width:'100%',padding:'10px',background:'transparent',border:`1px solid ${T.border}`,borderRadius:8,color:T.text3,fontWeight:600,cursor:'pointer',fontSize:13}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.danger;e.currentTarget.style.color=T.danger;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}>Exit without Backup</button>
              <button onClick={() => setIsClosing(false)} style={{width:'100%',padding:'10px',background:'transparent',border:'none',borderRadius:8,color:T.text3,fontWeight:400,cursor:'pointer',fontSize:12}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return(
    <ErrorBoundary>
      <AppInner/>
    </ErrorBoundary>
  );
}
