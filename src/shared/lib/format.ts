export function money(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function moneyFine(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  const digits = value > 0 && value < 0.01 ? 6 : value < 1 ? 4 : 2;
  return money(value, digits);
}

export function fert(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return `${value.toFixed(2)}×`;
}

export function whole(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US").format(value);
}

export function units(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

/** Wall time from a sealed run. 83s, 23m 20s, 1h 02m. */
export function elapsed(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "-";
  const total = Math.round(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${seconds}s`;
}
