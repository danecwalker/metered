export function money(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function moneyFine(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const digits = value > 0 && value < 0.01 ? 6 : value < 1 ? 4 : 2;
  return money(value, digits);
}

export function fert(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)}×`;
}

export function whole(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

export function units(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}
