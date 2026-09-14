export function frenchInstallment(principal: number, tnaPercent: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const i = tnaPercent / 100 / 12;
  if (i === 0) return principal / months;
  const factor = (i * Math.pow(1 + i, months)) / (Math.pow(1 + i, months) - 1);
  return principal * factor;
}

export interface CashRange {
  low: number;
  high: number;
}

/** Cash needed at closing for a given price: whatever the bank's max
 * loan doesn't cover, plus commissions/escribano/sellos as a % range
 * of the price (default 7–10%, per real quotes). */
export function cashNeededRange(
  priceUsd: number,
  bankMaxUsd: number,
  pctLow = 0.07,
  pctHigh = 0.1
): CashRange {
  const gap = Math.max(priceUsd - bankMaxUsd, 0);
  return { low: gap + priceUsd * pctLow, high: gap + priceUsd * pctHigh };
}

export function pricePerM2(priceUsd: number | null, superficieM2: number | null): number | null {
  if (!priceUsd || !superficieM2) return null;
  return Math.round(priceUsd / superficieM2);
}
