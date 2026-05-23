import React, { useState } from 'react';
import { fmtPct, fmt } from '../utils';
import { Ic } from '../icons';

export const NvBtn = ({children,onClick,variant='ghost',disabled,style:sx={},size='md',title}) => {
  const [h,sH]=useState(false);
  const sizes = {
    sm: {padding:'5px 12px', fontSize:11, borderRadius:6},
    md: {padding:'7px 16px', fontSize:12, borderRadius:8},
    lg: {padding:'10px 22px', fontSize:13, borderRadius:10},
  };
  const base = {
    display:'inline-flex',alignItems:'center',gap:6,border:'none',
    cursor:disabled?'not-allowed':'pointer',
    fontFamily:'inherit',fontWeight:600,letterSpacing:'.01em',
    transition:'all .15s ease',lineHeight:1,whiteSpace:'nowrap',
    opacity:disabled?.4:1,flexShrink:0,
    transform:h?'translateY(-1px)':'translateY(0)',
    ...sizes[size],...sx
  };
  const vs = {
    primary:{background:'var(--accent, #85c700)',color:'#000',boxShadow:h?'0 4px 12px rgba(133,199,0,.3)':'0 2px 8px rgba(133,199,0,.2)'},
    ghost:{background:h?'var(--surface4)':'transparent',color:'var(--text2)',border:'1px solid var(--border2)'},
    danger:{background:h?'rgba(229,72,77,.2)':'rgba(229,72,77,.1)',color:'var(--danger, #e5484d)',border:'1px solid rgba(229,72,77,.25)'},
  };
  return <button onClick={onClick} disabled={disabled} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} style={{...base,...(vs[variant]||vs.ghost)}} title={title}>{children}</button>;
};

export const NvInput = ({value,onChange,onKeyDown,onFocus:onFocusProp,onBlur:onBlurProp,placeholder,type='text',style:sx={},autoFocus,T}) => {
  const [f,sF]=useState(false);
  return <input autoFocus={autoFocus} type={type} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder}
    onFocus={e=>{sF(true);onFocusProp&&onFocusProp(e);}} onBlur={e=>{sF(false);onBlurProp&&onBlurProp(e);}}
    style={{padding:'9px 14px',background:T.surface3,border:`1px solid ${f?T.accent:T.border2}`,borderRadius:8,
      color:T.text,fontSize:13,outline:'none',width:'100%',boxSizing:'border-box',fontFamily:'inherit',
      transition:'border-color .2s, box-shadow .2s',caretColor:T.accent,
      boxShadow:f?`0 0 0 3px ${T.accent}15`:'none',...sx}}/>;
};

export const Badge = ({val,pct,currency,T,size='sm'}) => {
  if(val==null||isNaN(val))return<span style={{color:T.text3,fontSize:size==='sm'?12:14}}>—</span>;
  const pos=val>=0,col=pos?T.success:T.danger,bg=pos?T.successBg:T.dangerBg;
  return<span className="badge" style={{background:bg,color:col,fontSize:size==='sm'?12:14}}>
    {pct?fmtPct(val):`${pos?'+':'−'}${fmt(Math.abs(val),currency)}`}
  </span>;
};

export function SortTh({label,col,sort,onSort,T,right=false,minW,sticky=false}) {
  const active=sort.col===col,[h,sH]=useState(false);
  return<th onClick={()=>onSort(col)} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
    style={{padding:'10px 12px',background:T.surface2,borderBottom:`1px solid ${T.border}`,
      color:active?T.accent:h?T.text:T.text2,fontSize:11,fontWeight:600,whiteSpace:'nowrap',
      cursor:'pointer',userSelect:'none',textAlign:right?'right':'left',minWidth:minW,
      transition:'color .15s',position:sticky?'sticky':'static',left:sticky?0:'auto',zIndex:sticky?2:1}}>
    <span style={{display:'flex',alignItems:'center',gap:4,justifyContent:right?'flex-end':'flex-start'}}>
      {label}{active?<span style={{color:T.accent}}>{sort.dir==='asc'?<Ic.ChevU/>:<Ic.ChevD/>}</span>:<span style={{opacity:.3,color:T.text3}}><Ic.ChevD/></span>}
    </span>
  </th>;
}
