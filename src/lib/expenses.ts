/** Domestic Germany meal allowance, BMF rates in force since 2024. Amounts are cents. */
export const MEAL_FULL_DAY_CENTS = 2800;
export const MEAL_PARTIAL_DAY_CENTS = 1400;
export const MILEAGE_CENTS_PER_KM = 30;

export function mealAllowanceCents(input: {
  fullDay: boolean;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}): number {
  const base = input.fullDay ? MEAL_FULL_DAY_CENTS : MEAL_PARTIAL_DAY_CENTS;
  let cut = 0;
  if (input.breakfast) cut += Math.round(MEAL_FULL_DAY_CENTS * 0.2);
  if (input.lunch) cut += Math.round(MEAL_FULL_DAY_CENTS * 0.4);
  if (input.dinner) cut += Math.round(MEAL_FULL_DAY_CENTS * 0.4);
  return Math.max(0, base - cut);
}

export function mileageCents(kilometers: number): number {
  return Math.round(kilometers * MILEAGE_CENTS_PER_KM);
}

export function formatEuros(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(cents / 100);
}
