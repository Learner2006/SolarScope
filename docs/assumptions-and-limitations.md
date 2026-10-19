# Model Assumptions & Known Limitations

## 1. Physical Feasibility vs. Economic Feasibility

Financial attractiveness (e.g., a 5-year simple payback) does **not** prove structural or electrical feasibility:
- **Roof Dead Load & Structure:** Roof trusses, rafters, and decking must be professionally inspected to determine if they can bear the ~3 to 4 lbs/sq ft dead load of PV panels and racking.
- **Electrical Service Panel Capacity:** Older main breaker panels (e.g. 100A service) frequently require upgrading to 200A to satisfy the National Electrical Code (NEC 120% rule for solar backfeed breakers).
- **Zoning, Fire Setbacks, & HOA Rules:** Fire codes often mandate 3-foot pathways from roof ridges and edges for firefighter access, reducing usable panel surface area.

## 2. Atmospheric Reanalysis vs. Real-World Irradiance

- Renewables.ninja uses historical satellite and numerical reanalysis (MERRA-2).
- Real-world production in future years will deviate due to local microclimates, inter-annual weather variability, volcanic dust, or wildfire smoke.
- Modeled solar generation is a simulated estimate, not a guaranteed production warranty.

## 3. Micro-Shading & Obstacles

- Grid-cell reanalysis cannot detect localized obstacles such as chimneys, parapet walls, antennas, dormers, or mature trees.
- A physical shade analysis using a sun-eye or LiDAR survey is necessary for site-specific verification.
- Users can simulate shading impact via SolarScope's preset scenario (`-15% annual yield`).

## 4. Simplified Load Profile & Self-Consumption

- In this baseline release, self-consumption is modeled using a user-specified percentage (e.g. 65%).
- Real-world commercial and residential buildings have dynamic 15-minute load curves. Power generated during midday solar noon may exceed instantaneous facility demand, forcing higher grid export at lower feed-in tariffs than assumed by a flat percentage.

## 5. Inverter Replacement Amortization

- String inverters typically have a design life of 10 to 15 years, requiring replacement once during a 25-year panel lifetime.
- Unless factored into the annual maintenance line item or initial turnkey cost, this mid-life capital expense is omitted from simple payback.

## 6. Taxes, Incentives, and Financing Costs

- SolarScope calculates gross capital outlay and simple payback.
- Tax equity incentives (e.g., US Federal ITC 30%), state solar rebates, loan interest rates, and accelerated depreciation (MACRS) are excluded unless incorporated by the user into the turnkey cost.
