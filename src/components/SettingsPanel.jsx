import React, { useState, useEffect, useRef } from 'react';
import { NvBtn, NvInput } from './ui';
import { Ic } from '../icons';
import { callGroq, callGemini } from '../ai';

export default function SettingsPanel({tweaks,onUpdate,onClose,groqKey,geminiKey,primaryAI,onSaveAIKeys,goldApiKey,setGoldApiKey,T}) {
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
    <div className="modal-overlay animate-fadeIn" style={{background:'rgba(0,0,0,.4)'}}>
      <div onClick={onClose} className="modal-backdrop"/>
      <div className="modal-panel animate-scaleIn" style={{width:360,background:T.surface,borderColor:T.border2,color:T.text,margin:'8px 8px 0 0'}}>
        <div className="card-header" style={{borderColor:T.border,padding:'14px 18px',justifyContent:'space-between'}}>
          <span style={{fontSize:14,fontWeight:700}}>Settings</span>
          <button onClick={onClose} className="flex-center" style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:4}} aria-label="Close"><Ic.X/></button>
        </div>
        <div className="scroll-y" style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:14,maxHeight:'85vh'}}>
          {[{label:'Dark Mode',key:'darkMode'},{label:'Compact Rows',key:'compactRows'},{label:'Show P&L Charts',key:'showCharts'}].map(({label,key})=>(
            <div key={key} className="flex-between">
              <span style={{fontSize:13,color:T.text2}}>{label}</span>
              <div role="switch" aria-checked={tweaks[key]} tabIndex={0} onClick={()=>onUpdate(key,!tweaks[key])} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')onUpdate(key,!tweaks[key])}} style={{width:40,height:22,borderRadius:11,background:tweaks[key]?T.accent:T.surface4,position:'relative',cursor:'pointer',transition:'background .2s',border:`1px solid ${tweaks[key]?T.accent:T.border2}`}}>
                <div style={{position:'absolute',top:2,left:tweaks[key]?'calc(100% - 18px)':2,width:16,height:16,borderRadius:8,background:'#fff',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}/>
              </div>
            </div>
          ))}
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <div className="flex-between"><span style={{fontSize:13,color:T.text2}}>Auto Refresh</span><span style={{fontSize:13,fontWeight:600,color:T.accent}}>{tweaks.autoRefreshMins} min</span></div>
            <input type="range" min={1} max={30} step={1} value={tweaks.autoRefreshMins} onChange={e=>onUpdate('autoRefreshMins',parseInt(e.target.value))} style={{accentColor:T.accent}}/>
          </div>
          <div style={{borderTop:`1px solid ${T.border}`,paddingTop:14}}>
            <div style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>AI Providers</div>
            {PROVS.map(prov=>{
              const isActive=!!prov.key,isPrimary=primaryAI===prov.id,isEditing=editing===prov.id;
              return(
                <div key={prov.id} style={{marginBottom:10,background:T.surface3,borderRadius:T.radiusSm,border:`1px solid ${isPrimary&&isActive?T.accent:T.border}`,padding:'10px 12px',transition:`border-color ${T.transition}`}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:isEditing?10:4}}>
                    <div style={{width:24,height:24,borderRadius:5,background:prov.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>{prov.icon}</div>
                    <span style={{fontSize:12,fontWeight:700,color:T.text,flex:1}}>{prov.label}</span>
                    {isActive?<span className="chip" style={{background:T.successBg,color:T.success}}>Active</span>:<span className="chip" style={{background:T.surface4,color:T.text3}}>Off</span>}
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
            <div style={{background:T.surface3,borderRadius:T.radiusSm,border:`1px solid ${T.border}`,padding:'10px 12px'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <div style={{width:24,height:24,borderRadius:5,background:'linear-gradient(135deg,#FFD700,#b8860b)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>🟡</div>
                <span style={{fontSize:12,fontWeight:700,color:T.text,flex:1}}>GoldAPI.io</span>
                {goldApiKey?<span className="chip" style={{background:T.successBg,color:T.success}}>Active</span>:<span className="chip" style={{background:T.surface4,color:T.text3}}>Fallback (Yahoo)</span>}
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
            <div style={{background:T.surface3,borderRadius:T.radiusSm,border:`1px solid ${T.border}`,padding:'10px 12px'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <div style={{width:24,height:24,borderRadius:5,background:'linear-gradient(135deg,#76b900,#4a7500)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>🔒</div>
                <span style={{fontSize:12,fontWeight:700,color:T.text,flex:1}}>Password Protection</span>
                {tweaks.pin ? <span className="chip" style={{background:T.successBg,color:T.success}}>Locked</span> : <span className="chip" style={{background:T.surface4,color:T.text3}}>Unlocked</span>}
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
