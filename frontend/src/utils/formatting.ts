/**
 * Formatting utilities for engineering and financial numbers.
 */

export function formatCurrency(amount: number, minimumFractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(val: number, decimals = 1): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatPercent(fractionOrPct: number, isFraction = false, decimals = 1): string {
  const pct = isFraction ? fractionOrPct * 100 : fractionOrPct;
  return `${pct.toFixed(decimals)}%`;
}

export function formatEnergy(kwh: number): string {
  if (kwh >= 1000) {
    return `${formatNumber(kwh / 1000, 2)} MWh`;
  }
  return `${formatNumber(kwh, 0)} kWh`;
}

export function formatPower(kw: number): string {
  return `${formatNumber(kw, 2)} kW`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
