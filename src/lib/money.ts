/** Half a cent: tolerance for float comparisons between money amounts. */
export const CENT_EPSILON = 0.005;

/** Round a money amount to whole cents, correcting float drift (0.1 + 0.2). */
export function roundCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Whether `paid` covers `due`, tolerating sub-cent float error. */
export function amountsCover(paid: number, due: number): boolean {
  return paid >= due - CENT_EPSILON;
}

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/** Consistent USD formatting (always two decimals) for UI display. */
export function formatMoney(value: number): string {
  return usdFormatter.format(Number.isFinite(value) ? value : 0);
}
