# SolarScope Calculation Methodology

This document outlines the numerical model, formulas, calendar conventions, and assumptions implemented in the SolarScope engine.

---

## 1. Time-Series Representation & Calendar Duration

Renewables.ninja returns hourly power $P_t$ in kilowatts (kW) for each timestamp $t$. Since each step represents a 1-hour interval ($\Delta t = 1.0\text{ h}$):

$$E_t = P_t \times 1\text{ h} \quad (\text{kWh})$$

### Actual Period Hours ($H$)
Rather than hardcoding 8,760 hours, SolarScope dynamically calculates the exact hour count across the user's start and end dates:

$$H = [(\text{End Date} - \text{Start Date}) + 1] \times 24\text{ hours}$$

- **Non-Leap Year (365 days):** $365 \times 24 = 8,760\text{ hours}$
- **Leap Year (366 days):** $366 \times 24 = 8,784\text{ hours}$ (e.g., 2020, 2024)
- **Partial Periods:** Exactly $N \times 24\text{ hours}$ (e.g., 31 days in January = 744 hours).

If intervals are missing from the raw data provider, SolarScope reports the missing count explicitly rather than silently fabricating zero or average values.

---

## 2. Capacity Factor ($\text{CF}$)

Capacity factor expresses the ratio of actual generation to the theoretical maximum output if the system ran at full rated nameplate capacity for the entire period:

$$\text{CF} = \frac{\sum_{t=1}^{N} E_t}{P_{\text{rated}} \times H} \times 100\%$$

Where:
- $\sum E_t$ is total period generation (kWh).
- $P_{\text{rated}}$ is rated DC system capacity (kW).
- $H$ is the actual period duration in hours.

---

## 3. Self-Consumption & Energy Allocation

Without continuous smart-meter load telemetry, self-consumption is parameterized by user-specified ratio $S \in [0, 1.0]$:

- **Self-Consumed Energy ($E_{\text{self}}$):**
  $$E_{\text{self}} = E_{\text{total}} \times S$$
- **Grid-Exported Surplus ($E_{\text{export}}$):**
  $$E_{\text{export}} = E_{\text{total}} - E_{\text{self}}$$

---

## 4. Financial Calculations

### Avoided Import Savings ($\text{Savings}_{\text{import}}$)
Self-consumed electricity displaces electricity that would otherwise be purchased from the grid at the retail import tariff $T_{\text{import}}$ ($/kWh):

$$\text{Savings}_{\text{import}} = E_{\text{self}} \times T_{\text{import}}$$

### Export Compensation / Feed-in Revenue ($\text{Revenue}_{\text{export}}$)
Surplus power delivered back to the distribution grid is credited at the export tariff $T_{\text{export}}$ ($/kWh):

$$\text{Revenue}_{\text{export}} = E_{\text{export}} \times T_{\text{export}}$$

### Gross Annual Savings
$$\text{Savings}_{\text{gross}} = \text{Savings}_{\text{import}} + \text{Revenue}_{\text{export}}$$

### Net Annual Benefit
Deducts annual operations and maintenance ($\text{Cost}_{\text{O\&M}}$) from gross annual savings:

$$\text{Benefit}_{\text{net}} = \text{Savings}_{\text{gross}} - \text{Cost}_{\text{O\&M}}$$

---

## 5. Payback Period & Capital Recovery

### Simple Payback
Simple payback represents the time required for net cumulative annual cash flows to equal initial turnkey installation cost ($C_{\text{install}}$):

$$\text{Payback (years)} = \begin{cases}
0.0 & \text{if } C_{\text{install}} = 0 \\
\frac{C_{\text{install}}}{\text{Benefit}_{\text{net}}} & \text{if } \text{Benefit}_{\text{net}} > 0 \\
\text{Undefined (Non-recovering)} & \text{if } \text{Benefit}_{\text{net}} \le 0
\end{cases}$$

If $\text{Payback} > \text{Lifetime}$, the system is flagged as not recovering capital within its operational design life.

### 25-Year Undiscounted Lifetime Net Return
$$\text{Return}_{\text{lifetime}} = (\text{Benefit}_{\text{net}} \times \text{Lifetime Years}) - C_{\text{install}}$$

### Levelized Cost of Electricity (LCOE)
$$\text{LCOE} = \frac{C_{\text{install}} + (\text{Cost}_{\text{O\&M}} \times \text{Lifetime Years})}{E_{\text{total}} \times \text{Lifetime Years}} \quad (\$/\text{kWh})$$
