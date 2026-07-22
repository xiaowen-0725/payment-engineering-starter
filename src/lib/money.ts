// Amounts are an integer count of the currency's minor unit. They are validated
// on the way in and never divided here, so no rounding rule is needed. Keeping
// them as integers is the point; a payment amount is not a place for floats.
export interface Amount {
  readonly minorUnits: number;
  readonly currency: string; // ISO 4217, three uppercase letters
}

export function amount(minorUnits: number, currency: string): Amount {
  if (!Number.isInteger(minorUnits) || minorUnits <= 0) {
    throw new RangeError('amount must be a positive integer number of minor units');
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new RangeError('currency must be a three letter ISO code');
  }
  return { minorUnits, currency };
}
