import React, { useState, useMemo } from 'react';
import { NvBtn, NvInput } from '../components/ui';
import { fmt, short, fmtPct, gColor, isUS } from '../utils';
import { getItemSync } from '../storage';
import { Ic } from '../icons';

export default function ExportModule({ T, portfolios, prices, onClose }) {
  const [autoBackup, setAutoBackup] = useState(() => getItemSync('pm_auto_backup') === 'true');
  const [backupFreq, setBackupFreq] = useState(() => parseInt(getItemSync('pm_backup_freq') || '1'));
  const [exporting, setExporting] = useState(false);

  const allRows = useMemo(() => {
    return portfolios.flatMap(p => p.holdings.map(h => {
      const pr = prices[h.symbol];
      const cp = pr?.current ?? null;
      return { ...h, pfName: p.name, curPrice: cp, currency: pr?.currency || (isUS(h.symbol) ? 'USD' : 'INR'), value: cp != null ? cp * h.qty : null };
    }));
  }, [portfolios, prices]);

  const generateHTML = () => {
    const date = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });
    const totalVal = allRows.reduce((s, r) => s + (r.value || 0), 0);
    const totalInv = allRows.reduce((s, r) => s + r.buyPrice * r.qty, 0);
    const totalGain = totalVal - totalInv;
    const rowsHtml = allRows.map(r => `<tr><td>${short(r.symbol)}</td><td>${r.name}</td><td>${r.qty}</td><td>${r.currency === 'USD' ? '$' : '₹'}${r.buyPrice.toFixed(2)}</td><td>${r.curPrice ? (r.currency === 'USD' ? '$' : '₹') + r.curPrice.toFixed(2) : '—'}</td><td>${r.value ? (r.currency === 'USD' ? '$' : '₹') + r.value.toFixed(2) : '—'}</td></tr>`).join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Portfolio Report</title><style>body{font-family:-apple-system,sans-serif;padding:40px;color:#1a1a1a}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #e0e0e0}th{background:#f5f5f5;font-size:12px;text-transform:uppercase}h1{font-size:24px;margin-bottom:4px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:20px 0}.stat{padding:16px;background:#f9f9f9;border-radius:8px}.stat-label{font-size:11px;color:#666;text-transform:uppercase}.stat-value{font-size:20px;font-weight:700;margin-top:4px}</style></head><body>
<h1>Portfolio Manager Pro — Report</h1>
<p style="color:#666">Generated on ${date} · ${portfolios.length} portfolio(s) · ${allRows.length} holdings</p>
<div class="summary"><div class="stat"><div class="stat-label">Total Value</div><div class="stat-value">₹${totalVal.toLocaleString('en-IN',{maximumFractionDigits:0})}</div></div><div class="stat"><div class="stat-label">Total Invested</div><div class="stat-value">₹${totalInv.toLocaleString('en-IN',{maximumFractionDigits:0})}</div></div><div class="stat"><div class="stat-label">Total P&L</div><div class="stat-value" style="color:${totalGain>=0?'#388e3c':'#d32f2f'}">${totalGain>=0?'+':'-'}₹${Math.abs(totalGain).toLocaleString('en-IN',{maximumFractionDigits:0})}</div></div><div class="stat"><div class="stat-label">Return</div><div class="stat-value">${totalInv?((totalGain/totalInv)*100).toFixed(2):'0'}%</div></div></div>
<table><thead><tr><th>Symbol</th><th>Name</th><th>Qty</th><th>Buy Price</th><th>LTP</th><th>Value</th></tr></thead><tbody>${rowsHtml}</tbody></table>
</body></html>`;
  };

  const exportPDF = () => {
    setExporting(true);
    try {
      const html = generateHTML();
      const blob = new Blob([html], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Portfolio_Report_${new Date().toISOString().slice(0,10)}.html`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { alert('Export failed: ' + e.message); }
    setExporting(false);
  };

  const exportCSV = () => {
    const headers = ['Portfolio','Symbol','Name','Qty','Buy Price','Currency','LTP','Value'];
    const rows = allRows.map(r => [r.pfName, r.symbol, r.name, r.qty, r.buyPrice, r.currency, r.curPrice||'', r.value||'']);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `Portfolio_Export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div className="grow scroll-y">
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
        <div className="flex-between" style={{flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Export & Backup</div>
            <div style={{fontSize:13,color:T.text3}}>Download reports · Auto-backup settings</div>
          </div>
          {onClose&&<NvBtn onClick={onClose} T={T}><Ic.X/> Close</NvBtn>}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
          <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:16,display:'flex',flexDirection:'column',gap:10}}>
            <div style={{fontSize:24}}>📄</div>
            <div style={{fontWeight:700,fontSize:14,color:T.text}}>HTML Report</div>
            <div style={{fontSize:11,color:T.text3,flex:1}}>Printable portfolio report with summary cards and full holdings table.</div>
            <NvBtn onClick={exportPDF} disabled={exporting} variant="primary" T={T}><Ic.Download/> {exporting?'Generating…':'Download Report'}</NvBtn>
          </div>
          <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:16,display:'flex',flexDirection:'column',gap:10}}>
            <div style={{fontSize:24}}>📊</div>
            <div style={{fontWeight:700,fontSize:14,color:T.text}}>CSV Export</div>
            <div style={{fontSize:11,color:T.text3,flex:1}}>Raw data export for Excel/Google Sheets analysis.</div>
            <NvBtn onClick={exportCSV} T={T}><Ic.Download/> Export CSV</NvBtn>
          </div>
          <div style={{background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,padding:16,display:'flex',flexDirection:'column',gap:10}}>
            <div style={{fontSize:24}}>💾</div>
            <div style={{fontWeight:700,fontSize:14,color:T.text}}>Auto Backup</div>
            <div style={{fontSize:11,color:T.text3,flex:1}}>Automatically save portfolio data on schedule.</div>
            <div className="flex-between" style={{gap:8}}>
              <span style={{fontSize:12,color:T.text2}}>Enable</span>
              <div onClick={()=>setAutoBackup(!autoBackup)} style={{width:36,height:20,borderRadius:10,background:autoBackup?T.accent:T.surface4,position:'relative',cursor:'pointer',border:`1px solid ${autoBackup?T.accent:T.border2}`}}>
                <div style={{position:'absolute',top:2,left:autoBackup?'calc(100% - 16px)':2,width:14,height:14,borderRadius:7,background:'#fff',transition:'left .2s'}}/>
              </div>
            </div>
            {autoBackup && (
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:11,color:T.text3}}>Every</span>
                <select value={backupFreq} onChange={e=>setBackupFreq(parseInt(e.target.value))} style={{padding:'3px 6px',background:T.surface3,border:`1px solid ${T.border2}`,borderRadius:4,color:T.text,fontSize:11}}>
                  <option value={1}>1 hour</option><option value={6}>6 hours</option><option value={12}>12 hours</option><option value={24}>Daily</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
