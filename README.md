# Portfolio Manager Pro (v4.9.2)

A high-performance **Windows 11 desktop application** for managing a comprehensive personal portfolio including Indian Equity, US Equity, **National Pension System (NPS)**, and **Physical Gold**. 

Built with **React 18 + Vite + Electron** — Featuring an NVIDIA-inspired "Orbitron" dark UI, high-precision XIRR engine, and automated financial tracking.

---

## 🚀 Key Features

### 🟡 Physical Gold Asset Tracker (v4.9.0 - v4.9.2)
- **Live 24K Valuation** — Real-time price tracking using **GoldAPI.io** (with Yahoo Finance fallback) for high-accuracy Indian market rates.
- **GST Integrated Logic** — Automatically applies the mandatory **3% GST** to live base prices to provide a realistic "Sale Value" estimation.
- **Historical Purchases** — Track weight in grams, invoice values, and acquisition dates with automatic P&L calculation.
- **Unified Backup** — Gold holdings are automatically included in the daily CSV auto-backup routine.

### 🛡️ NPS Portfolio Monitor (v4.8.0)
- **Precision XIRR Engine** — Robust **Newton-Raphson XIRR solver** that models monthly cash flows and withdrawals.
- **Persistent Calibration** — User-controlled "Step-up %" settings are now saved across sessions for consistent XIRR alignment with official NPS data.
- **Unified Value Breakdown** — Clear separation of **Stocks Value** vs. **NPS Value** in historical tracking for full portfolio transparency.

### 📈 Smart History Tracking (v4.9.1)
- **Background Snapshots** — Automated daily snapshots of total portfolio wealth (Equity + NPS + Gold) are saved whenever prices refresh.
- **Detailed Analytics** — Interactive SVG charts with daily change tracking (₹ and $) and since-start gain/loss reporting.

---

## 🧰 Tools & Modules

| Tool | Description |
|---|---|
| 🛡️ **NPS** | **High-precision XIRR tracking** with persistent Step-up calibration and asset allocation (E, C, G). |
| 🟡 **Gold** | **Physical Asset Tracking** with 24K live rates, 3% GST logic, and acquisition cost monitoring. |
| 📈 **History** | **Background daily snapshots** with detailed Stocks vs. NPS vs. Gold value breakdown. |
| 👁 **Watchlist** | Track stocks with target entry/exit prices and "Near Entry" alerts. |
| 📊 **Benchmark** | Real-time performance comparison vs **Nifty 50** and **S&P 500**. |

---

## 📄 Project Info

| | |
|---|---|
| Version | 4.9.2 |
| Author | Arun Verma |
| Repository | Private / Personal |
| Platform | Windows 10/11 (64-bit) |

---

## 🔧 Release Notes (v4.9.0 - v4.9.2)
- **v4.9.2**: **GoldAPI.io Integration**. Added support for premium gold price data and improved fallback to XAUINR=X for accurate Indian valuations.
- **v4.9.1**: **Stability Patch**. Fixed ReferenceError for GoldModule lazy-loading and added Gold to mobile BottomNav.
- **v4.9.0**: **Gold Module Launch**. Introduced physical gold tracking with GST logic and daily backup integration.
