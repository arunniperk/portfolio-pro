import React from 'react';
import { Ic } from '../icons';

const ITEMS = [
  {id:'IN', label:'Indian', icon: <Ic.India/>},
  {id:'US', label:'US', icon: <Ic.US/>},
  {id:'NPS', label:'NPS', icon: '🛡️'},
  {id:'GOLD', label:'Gold', icon: '🟡'},
  {id:'watchlist', label:'Watch', icon: '👁'},
  {id:'news', label:'News', icon: '📰'},
  {id:'alerts', label:'Alerts', icon: '🔔'},
];

export default function BottomNav({activeId, activeModule, onSwitch, T}) {
  return (
    <div className="mobile-bottom-nav" style={{height:60, background:T.sidebar, borderTop:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-around', position:'fixed', bottom:0, left:0, right:0, zIndex:1000}}>
      {ITEMS.map(item => {
        const isActive = (item.id === 'IN' || item.id === 'US') ? (!activeModule && activeId === item.id) : (activeModule === item.id);
        return (
          <div key={item.id} onClick={() => onSwitch(item.id)} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer', color: isActive ? T.accent : T.text3}}>
            <div style={{fontSize:18}}>{item.icon}</div>
            <div style={{fontSize:10, fontWeight:isActive?700:400}}>{item.label}</div>
          </div>
        );
      })}
    </div>
  );
}
