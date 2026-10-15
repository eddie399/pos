/**
 * Money helpers. All arithmetic happens in integer minor units (tambala) so
 * totals never drift the way floating point produces `1234.5600000000002`.
 * We only convert back to a decimal number at the Prisma boundary.
 */

export const MINOR_UNITS_PER_UNIT = 100;

export function toMinor(value: number | string): number {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    throw new Error(`Invalid money value: ${String(value)}`);
  }

  return Math.round(numeric * MINOR_UNITS_PER_UNIT);
}

export function fromMinor(minor: number): number {
  return Number((minor / MINOR_UNITS_PER_UNIT).toFixed(2));
}

export function formatMoney(value: number | string, currency = "MWK"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

/**
 * Split `totalMinor` across `weights` so the parts add up to exactly
 * `totalMinor` (largest remainder method). Used to push a sale level discount
 * down onto individual sale items, keeping the ledger internally consistent:
 * sum(item.total) + discount === sale.subtotal.
 */
export function allocateMinor(totalMinor: number, weights: number[]): number[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);

  if (totalMinor <= 0 || weightSum <= 0 || weights.length === 0) {
    return weights.map(() => 0);
  }

  const exact = weights.map((weight) => (totalMinor * weight) / weightSum);
  const allocated = exact.map((value) => Math.floor(value));
  let remainder = totalMinor - allocated.reduce((sum, value) => sum + value, 0);

  const byFraction = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction);

  for (const entry of byFraction) {
    if (remainder <= 0) {
      break;
    }

    allocated[entry.index] += 1;
    remainder -= 1;
  }

  return allocated;
}
