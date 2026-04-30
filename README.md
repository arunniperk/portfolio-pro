# Portfolio Manager Pro (v5.1.0)

A high-performance **Windows 11 desktop application** for managing a comprehensive personal portfolio including Indian Equity, US Equity, **National Pension System (NPS)**, and **Physical Gold**. 

Built with **React 18 + Vite + Electron** — Featuring an NVIDIA-inspired "Orbitron" dark UI, high-precision XIRR engine, and automated financial tracking.

---

## 🚀 Key Features

### 📈 Smart Holdings Management (v5.1.0)
- **Inline Editing** — Directly modify **Quantity (Qty)** and **Buy Price** within the Indian and US Equity tables.
- **Real-time Recalculation** — Instant updates to Invested Value, Current Value, P&L, and Portfolio Allocation upon editing.
- **Persistence** — All manual adjustments are automatically saved to the local database and reflected in daily backups.

### 🟡 Advanced Gold Tracker (v5.1.0)
- **Dual Live Rates** — Real-time tracking of both **24K** and **22K** gold rates, inclusive of **3% GST**.
- **Purity Conversion** — Option to add gold in 22K purity with automatic internal conversion to **24K equivalent weight** (0.916 purity factor).
- **GST Integrated Logic** — Realistic "Sale Value" estimation based on current market rates + mandatory taxes.
- **Detailed History** — Track original purity, raw weight, and 24K equivalent weight for every acquisition.

### 🛡️ NPS Portfolio Monitor (v5.0.0)
- **Precision XIRR Engine** — Robust **Newton-Raphson XIRR solver** that models monthly cash flows and withdrawals.
- **Persistent Calibration** — User-controlled "Step-up %" settings are saved across sessions for consistent XIRR alignment.
- **Unified Value Breakdown** — Clear separation of **Stocks Value** vs. **NPS Value** in historical tracking.

### 📊 Historical Analytics (v5.0.0)
- **Filtered Timeline** — Performance logs now start from a clean baseline (**30th April 2026**), providing focused historical data.
- **Background Snapshots** — Automated daily snapshots of total portfolio wealth (Equity + NPS + Gold).
- **Interactive Dashboards** — Integrated **Alerts**, **Sector Analysis**, and **Benchmark Comparison** modules.

---

## 🧰 Tools & Modules

| Tool | Description |
|---|---|
| 🛡️ **NPS** | **High-precision XIRR tracking** with persistent Step-up calibration and asset allocation (E, C, G). |
| 🟡 **Gold** | **Advanced Physical Tracking** with 24K/22K live rates, 3% GST, and purity conversion. |
| 📈 **History** | **Daily snapshots** with detailed asset breakdown and April 2026 baseline. |
| ✏️ **Edit** | **Inline holdings management** for Qty and Buy Price adjustments. |
| 👁 **Watchlist** | Track stocks with target entry/exit prices and "Near Entry" alerts. |
| 📊 **Benchmark** | Real-time performance comparison vs **Nifty 50** and **S&P 500**. |

---

## 📄 Project Info

| | |
|---|---|
| Version | 5.1.0 |
| Author | Arun Verma |
| Repository | Private / Personal |
| Platform | Windows 10/11 (64-bit) |

---

## 🔧 Release Notes (v5.0.0 - v5.1.0)
- **v5.1.0**: **Interactive Editing & Dual Gold Rates**. Added inline editing for stock holdings and 22K/24K purity tracking with conversion logic.
- **v5.0.0**: **Stability & Baseline Update**. Resolved React #306 rendering crashes. Restored Alerts/Sector/Benchmark modules. Filtered history log to start from April 30, 2026.
- **v4.9.2**: **GoldAPI.io Integration**. Added support for premium gold price data.
