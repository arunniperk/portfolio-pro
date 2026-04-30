# Portfolio Manager Pro (v6.0.0)

A high-performance **Windows 11 desktop application** for managing a comprehensive personal portfolio including Indian Equity, US Equity, **Mutual Funds**, **National Pension System (NPS)**, **Public Provident Fund (PPF)**, and **Physical Gold**. 

Built with **React 18 + Vite + Electron** — Featuring an NVIDIA-inspired "Orbitron" dark UI, high-precision XIRR engine, and automated financial tracking.

---

## 🚀 Key Features (v6.0.0)

### 📊 Asset Performance Dashboard
- **Consolidated Tracking** — A centralized view tracking **India Equity**, **US Equity (INR)**, **Mutual Funds**, **NPS**, **PPF**, and **Gold**.
- **Explicit Valuation Formula** — Total Value is strictly calculated as the sum of all tracked growth assets, providing a transparent net worth snapshot.
- **Asset Allocation & Performance** — Detailed breakdown of Invested vs. Current value with automated Gain/Loss calculations for every asset class.

### 🏦 Automated PPF Tracker
- **Historical Interest Rates** — Accurate tracking using prevailing SBI/Government rates (e.g., 7.9% in 2019, 7.1% from 2020 onwards).
- **Automated Annual Accrual** — Monthly interest calculation (based on lowest balance) with automatic annual crediting on **March 31st**.
- **Smart Gain Logic** — Distinct separation between Principal contributions and Interest credits for accurate performance reporting in the dashboard.

### 📦 Mutual Fund Integration
- **Scheme Name Auto-Lookup** — Automatically fetches fund names based on Scheme Codes.
- **Unified Valuation** — Integrated into the core portfolio aggregation for a complete wealth view.

### 🛡️ NPS Portfolio Monitor
- **Precision XIRR Engine** — Robust **Newton-Raphson XIRR solver** that models monthly cash flows and withdrawals.
- **Persistent Calibration** — User-controlled "Step-up %" settings are saved across sessions for consistent XIRR alignment.

### 🟡 Advanced Gold Tracker
- **Dual Live Rates** — Real-time tracking of both **24K** and **22K** gold rates, inclusive of **3% GST**.
- **Purity Conversion** — Automatic internal conversion to **24K equivalent weight** (0.916 purity factor for 22K gold).

---

## 🧰 Tools & Modules

| Tool | Description |
|---|---|
| 📈 **Performance** | **Centralized Dashboard** for total wealth tracking across all asset classes. |
| 🏦 **PPF** | **Automated interest tracking** with historical rate lookup and annual accrual. |
| 🛡️ **NPS** | **High-precision XIRR tracking** with persistent Step-up calibration. |
| 🟡 **Gold** | **Advanced Physical Tracking** with live rates, GST, and purity conversion. |
| 📦 **MF** | **Mutual Fund tracking** with scheme lookup and automated valuation. |
| 👁 **Watchlist** | Track stocks with target entry/exit prices and "Near Entry" alerts. |

---

## 📄 Project Info

| | |
|---|---|
| Version | 6.0.0 |
| Author | Arun Verma |
| Repository | Private / Personal |
| Platform | Windows 10/11 (64-bit) |

---

## 🔧 Release Notes

- **v6.0.0**: **Major Dashboard & PPF Overhaul**.
  - Implemented centralized **Asset Performance Dashboard**.
  - Added **Automated PPF Interest** tracking with historical rates.
  - Streamlined UI by removing non-essential modules (Benchmarks, Daily Logs).
  - Unified valuation logic across all asset classes.
- **v5.1.0**: **Interactive Editing & Dual Gold Rates**. Added inline editing for stock holdings and 22K/24K purity tracking.
- **v5.0.0**: **Stability & Baseline Update**. Resolved React #306 rendering crashes. Filtered history log to start from April 30, 2026.
