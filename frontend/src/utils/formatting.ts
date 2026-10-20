/**
 * Formatting utilities for engineering and financial numbers.
 */

export function getCurrencySymbol(currencyCode = "USD"): string {
  const code = (currencyCode || "USD").toUpperCase();
  try {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0);
    return formatted.replace(/[0-9\s]/g, "") || code;
  } catch {
    return code;
  }
}

export function formatCurrency(
  amount: number,
  currencyOrDigits: string | number = "USD",
  minimumFractionDigits = 0
): string {
  let currencyCode = "USD";
  let minDigits = minimumFractionDigits;

  if (typeof currencyOrDigits === "number") {
    minDigits = currencyOrDigits;
  } else if (typeof currencyOrDigits === "string") {
    currencyCode = currencyOrDigits;
  }

  const code = (currencyCode || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: minDigits,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toLocaleString("en-US", {
      minimumFractionDigits: minDigits,
      maximumFractionDigits: 2,
    })}`;
  }
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

export function formatCoordinates(lat: number, lon: number, decimals = 4): string {
  const latCard = lat >= 0 ? "N" : "S";
  const lonCard = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(decimals)}° ${latCard}, ${Math.abs(lon).toFixed(decimals)}° ${lonCard}`;
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
