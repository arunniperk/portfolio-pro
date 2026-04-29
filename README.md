# Portfolio Manager Pro (Personal Edition)

A high-performance **Windows 11 desktop application** for managing a comprehensive personal portfolio including Indian Equity, US Equity, and **National Pension System (NPS)**. 

Built with **React 18 + Vite + Electron** — Featuring an NVIDIA-inspired "Orbitron" dark UI, high-precision XIRR engine, and automated financial tracking.

---

## 🚀 Key Features

### 🛡️ NPS Portfolio Monitor (v4.7.0)
- **Pension Fund Tracking** — Manage multiple Fund Managers (SBI, HDFC, UTI, etc.) with Tier-I/II support.
- **Precision XIRR Engine** — Replaced basic CAGR with a robust **Newton-Raphson XIRR solver** that models monthly cash flows and withdrawals.
- **Historical Analysis** — Extracted and integrated 13+ years of historical contribution data (183+ entries) for verified 0.1% accuracy.
- **Automated "Invest" Flow** — One-click monthly investment adds units based on live NAV and updates the XIRR investment base automatically.

### 🔒 Data Safety & Integrity (v4.7.0)
- **Mandatory Deletion Checks** — Implemented application-wide `window.confirm` dialogs for every data-destructive action (Portfolio, Holding, Alert, Note, PFM removal).
- **Redundant Persistence** — Added new NPS and NAV keys to the pre-load synchronization engine to ensure 0% data loss across restarts.
- **Auto-Backups** — Mandatory CSV exports on exit containing full holdings, alerts, and transaction history.

### ⚡ Performance & AI
- **75% Payload Reduction** — Advanced code splitting using **React.lazy**. Initial bundle size is just **117 KB**.
- **Dual AI Analysis** — Deep sentiment analysis and risk assessment using **Groq (Llama 3.3)** and **Gemini 2.0 Flash**.
- **Dynamic Charting** — Interactive SVG price charts with real-time target/buy overlays and LTCG/STCG indicators.

---

## 🧰 Tools & Modules

| Tool | Description |
|---|---|
| 🛡️ **NPS** | **High-precision XIRR tracking** for Pension Funds with asset allocation (E, C, G). |
| 👁 **Watchlist** | Track stocks with target entry/exit prices and "Near Entry" alerts. |
| 🔔 **Alerts** | Market-segregated price triggers with sorting and historical hit tracking. |
| 📊 **Benchmark** | Real-time performance comparison vs **Nifty 50** and **S&P 500**. |
| 📈 **History** | Auto-snapshots combined portfolio wealth daily in unified INR terms. |

---

## 🛠️ Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 + Vanilla CSS |
| Desktop | Electron 41 (Frameless / Drag-to-Move) |
| Finance | Yahoo Finance API (Stocks) + Moneycontrol Scraper (NPS) |
| Math | Custom Newton-Raphson XIRR Solver |
| Storage | File-based Write-Through Cache (Documents\Portfolio) |

---

## 📄 Project Info

| | |
|---|---|
| Version | 4.7.0 |
| Author | Arun Verma |
| Repository | Private / Personal |
| Platform | Windows 10/11 (64-bit) |

---

## 🔧 v4.7.0 Release Notes
- **Fixed XIRR Logic**: Moved from lump-sum CAGR to cash-flow-aware XIRR using synthetic monthly interpolation.
- **Fixed Data Loss**: Resolved a critical bug where NPS data wasn't being preloaded from disk on startup.
- **Added Safety Layer**: Mandatory confirmations added to all delete buttons to prevent accidental state wipes.
- **NPS PDF Parser (Manual)**: Extracted and verified 183 historical contributions from PDF statement for legacy tracking.
