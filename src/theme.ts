import type { Theme, Holding, Portfolio, Tweaks } from './types';

export const mkT = (dark = true): Theme => {
  const base = dark ? {
    bg:       '#0c0c0d',
    sidebar:  '#0f0f11',
    surface:  '#161618',
    surface2: '#1c1c1f',
    surface3: '#222226',
    surface4: '#2a2a2e',
    border:   '#2e2e33',
    border2:  '#38383d',
    text:     '#f0f0ee',
    text2:    '#a8a8a2',
    text3:    '#6b6b66',
    text4:    '#4a4a48',
    accent:   '#85c700',
    accentDim:'#5c8a00',
    accentBg: 'rgba(133,199,0,.12)',
    accentBg2:'rgba(133,199,0,.06)',
    success:  '#85c700',
    successBg:'rgba(133,199,0,.14)',
    danger:   '#e5484d',
    dangerBg: 'rgba(229,72,77,.12)',
    warning:  '#f5a623',
    warnBg:   'rgba(245,166,35,.12)',
    cyan:     '#40b4d8',
    inColor:  '#f5a623',
    usColor:  '#40b4d8',
  } : {
    bg:       '#f5f5f0',
    sidebar:  '#1a1a1e',
    surface:  '#ffffff',
    surface2: '#fafaf8',
    surface3: '#f2f2ee',
    surface4: '#e8e8e4',
    border:   '#e4e4e0',
    border2:  '#d4d4d0',
    text:     '#1a1a18',
    text2:    '#5c5c58',
    text3:    '#9c9c98',
    text4:    '#c0c0bc',
    accent:   '#6b9e00',
    accentDim:'#4a7500',
    accentBg: 'rgba(107,158,0,.10)',
    accentBg2:'rgba(107,158,0,.05)',
    success:  '#3d8b40',
    successBg:'rgba(61,139,64,.10)',
    danger:   '#d53d42',
    dangerBg: 'rgba(213,61,66,.10)',
    warning:  '#e68a00',
    warnBg:   'rgba(230,138,0,.08)',
    cyan:     '#0088b0',
    inColor:  '#e68a00',
    usColor:  '#0088b0',
  };

  return {
    ...base,
    r:        10,
    radiusSm: 8,
    radiusLg: 16,
    fontXs:   10,
    fontSm:   12,
    fontMd:   13,
    fontLg:   14,
    fontXl:   20,
    font2Xl:  28,
    shadow:   dark ? '0 1px 3px rgba(0,0,0,.3), 0 1px 2px rgba(0,0,0,.2)' : '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
    shadowLg: dark ? '0 10px 40px rgba(0,0,0,.4), 0 2px 8px rgba(0,0,0,.25)' : '0 10px 40px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.04)',
    glow:     dark ? `0 0 24px ${base.accent}22` : 'none',
    transition: '.15s ease',
    transitionSlow: '.25s cubic-bezier(0.4, 0, 0.2, 1)',
  };
};

export const PIE = ['#85c700','#40b4d8','#f5a623','#e5484d','#a855f7','#3b82f6','#22d3ee','#f97316','#84cc16','#06b6d4','#facc15','#fbbf24','#ec4899','#2dd4bf','#a78bfa'];
export const PORT_COLORS = ['#85c700','#40b4d8','#f5a623','#e5484d','#a855f7','#3b82f6','#22d3ee','#f97316'];

export const DEF_H: Holding[] = [
  {id:1,symbol:'RELIANCE.NS',name:'Reliance Industries',qty:10,unpledgedQty:0,buyPrice:2800},
  {id:2,symbol:'TCS.NS',name:'TCS',qty:5,unpledgedQty:0,buyPrice:3500},
  {id:3,symbol:'INFY.NS',name:'Infosys',qty:20,unpledgedQty:0,buyPrice:1400},
  {id:4,symbol:'VEDL.NS',name:'Vedanta',qty:50,unpledgedQty:0,buyPrice:280},
  {id:5,symbol:'AAPL',name:'Apple Inc.',qty:3,unpledgedQty:0,buyPrice:160},
  {id:6,symbol:'MSFT',name:'Microsoft Corp.',qty:2,unpledgedQty:0,buyPrice:280},
];
export const DEF_T: Record<string, number> = {1:3200,2:4000,3:1800,5:220,6:450};
export const DEF_PF: Portfolio[] = [{id:1,name:'Main Portfolio',holdings:DEF_H,targets:DEF_T}];

export const TWEAK_DEF: Tweaks = {darkMode:true,autoRefreshMins:5,compactRows:false,showCharts:true,glowIntensity:60,pin:''};
