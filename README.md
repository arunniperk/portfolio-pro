# Portfolio Manager Pro (v4.8.0)

A high-performance **Windows 11 desktop application** for managing a comprehensive personal portfolio including Indian Equity, US Equity, and **National Pension System (NPS)**. 

Built with **React 18 + Vite + Electron** — Featuring an NVIDIA-inspired "Orbitron" dark UI, high-precision XIRR engine, and automated financial tracking.

---

## 🚀 Key Features

### 🛡️ NPS Portfolio Monitor (v4.8.0)
- **Precision XIRR Engine** — Robust **Newton-Raphson XIRR solver** that models monthly cash flows and withdrawals.
- **Persistent Calibration** — User-controlled "Step-up %" settings are now saved across sessions for consistent XIRR alignment with official NPS data.
- **Unified Value Breakdown** — Clear separation of **Stocks Value** vs. **NPS Value** in historical tracking for full portfolio transparency.
- **Historical Analysis** — Extracted and integrated 13+ years of historical contribution data for verified 0.1% accuracy.

### 📈 Smart History Tracking (v4.8.0)
- **Background Snapshots** — Automated daily snapshots of total portfolio wealth (Equity + NPS) are saved whenever prices refresh, ensuring no data gaps.
- **Detailed Analytics** — Interactive SVG charts with daily change tracking (₹ and $) and since-start gain/loss reporting.
- **Multicurrency Support** — Seamlessly combines INR and USD holdings into a single, unified historical curve using live FX rates.

### 🔒 Data Safety & Integrity
- **Mandatory Deletion Checks** — Application-wide `window.confirm` dialogs for every data-destructive action.
- **Redundant Persistence** — Write-through caching to `Documents\Portfolio` ensures 0% data loss across restarts.
- **Auto-Backups** — CSV exports on exit containing full holdings, alerts, and transaction history.

---

## 🧰 Tools & Modules

| Tool | Description |
|---|---|
| 🛡️ **NPS** | **High-precision XIRR tracking** with persistent Step-up calibration and asset allocation (E, C, G). |
| 📈 **History** | **Background daily snapshots** with detailed Stocks vs. NPS value breakdown. |
| 👁 **Watchlist** | Track stocks with target entry/exit prices and "Near Entry" alerts. |
| 🔔 **Alerts** | Market-segregated price triggers with sorting and historical hit tracking. |
| 📊 **Benchmark** | Real-time performance comparison vs **Nifty 50** and **S&P 500**. |

---

## 📄 Project Info

| | |
|---|---|
| Version | 4.8.0 |
| Author | Arun Verma |
| Repository | Private / Personal |
| Platform | Windows 10/11 (64-bit) |

---

## 🔧 v4.8.0 Release Notes
- **Major History Refactor**: Implemented automated background snapshots; no more manual saving required.
- **NPS Transparency**: Added separate value tracking for NPS within the History module.
- **Persistent Settings**: Lifted and persisted XIRR calibration (Step-up %) and NAV data.
- **Stable State Engine**: Resolved critical crashes related to prop synchronization and state lifting.
