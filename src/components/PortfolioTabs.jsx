import React, { useState, useEffect, useRef } from 'react';
import { PORT_COLORS } from '../theme';
import { Ic } from '../icons';

export default function PortfolioTabs({portfolios,activeId,onSwitch,onAdd,onRename,onDelete,T}) {
  const [editId,setEditId]=useState(null);
  const [editName,setEditName]=useState('');
  const inputRef=useRef();
  const commit=()=>{if(editName.trim())onRename(editId,editName.trim());setEditId(null);};
  useEffect(()=>{if(editId&&inputRef.current)inputRef.current.focus();},[editId]);
  return(
    <div style={{display:'flex',alignItems:'center',gap:4,padding:'0 20px',borderBottom:`1px solid ${T.border}`,background:T.surface,height:38,flexShrink:0,overflowX:'auto',position:'relative',zIndex:10}}>
      {portfolios.map((p,i)=>{const active=p.id===activeId,color=PORT_COLORS[i%PORT_COLORS.length];return(
        <div key={p.id} onClick={()=>onSwitch(p.id)} style={{display:'flex',alignItems:'center',gap:6,height:38,padding:'0 14px',cursor:'pointer',flexShrink:0,userSelect:'none',borderBottom:active?`2px solid ${color}`:'2px solid transparent',color:active?T.text:T.text3,transition:'all .15s',fontSize:12,fontWeight:active?600:400}} role="tab" aria-selected={active} tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')onSwitch(p.id)}}>
          {editId===p.id?<input ref={inputRef} value={editName} onChange={e=>setEditName(e.target.value)} onBlur={commit} onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Enter')commit();if(e.key==='Escape')setEditId(null);}} style={{width:100,padding:'1px 6px',background:T.surface3,color:T.text,fontSize:12,border:`1px solid ${color}`,borderRadius:4,outline:'none'}}/>
          :<span onDoubleClick={e=>{e.stopPropagation();setEditId(p.id);setEditName(p.name);}}>{p.name}</span>}
          <span style={{fontSize:10,background:active?color+'20':T.surface3,color:active?color:T.text3,padding:'1px 6px',borderRadius:10,fontWeight:600}}>{p.holdings.length}</span>
          {portfolios.length>1&&active&&<button onClick={e=>{e.stopPropagation();onDelete(p.id);}} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,padding:'1px 2px',display:'flex',lineHeight:1,transition:'color .1s'}} onMouseEnter={e=>e.currentTarget.style.color=T.danger} onMouseLeave={e=>e.currentTarget.style.color=T.text3} aria-label={`Delete ${p.name}`}><Ic.X/></button>}
        </div>
      );})}
      <button onClick={onAdd} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 10px',marginLeft:4,border:`1px solid ${T.border}`,borderRadius:6,background:'transparent',color:T.text3,cursor:'pointer',fontSize:11,fontWeight:600,transition:'all .13s',flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.color=T.accent;e.currentTarget.style.borderColor=T.accent;}} onMouseLeave={e=>{e.currentTarget.style.color=T.text3;e.currentTarget.style.borderColor=T.border;}} aria-label="Add portfolio"><Ic.Plus/> New</button>
      <span style={{marginLeft:8,fontSize:10,color:T.text3,flexShrink:0,opacity:.5}}>Double-click to rename</span>
    </div>
  );
}
