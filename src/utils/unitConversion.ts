/**
 * Unit Conversion Utilities
 *
 * The app stores all weights internally in kilograms (kg).
 * These utilities handle conversion between kg and the user's display unit.
 */

const LBS_TO_KG = 0.45359237;
const KG_TO_LBS = 2.20462262;

/**
 * Convert from display unit to kg for storage
 * Call this when saving user input
 */
export function toKg(value: number, fromUnit: 'kg' | 'lbs'): number {
  if (fromUnit === 'kg') return value;
  return value * LBS_TO_KG;
}

/**
 * Convert from kg to display unit for showing to user
 * Call this when displaying stored values
 */
export function fromKg(valueKg: number, toUnit: 'kg' | 'lbs'): number {
  if (toUnit === 'kg') return valueKg;
  return valueKg * KG_TO_LBS;
}

/**
 * Convert and round for display (cleaner numbers)
 * Rounds to 1 decimal place
 */
export function fromKgDisplay(valueKg: number, toUnit: 'kg' | 'lbs'): number {
  const converted = fromKg(valueKg, toUnit);
  return Math.round(converted * 10) / 10;
}

/**
 * Convert and format for display with unit label
 */
export function formatWeight(valueKg: number, toUnit: 'kg' | 'lbs'): string {
  const converted = fromKgDisplay(valueKg, toUnit);
  return `${converted} ${toUnit}`;
}

/**
 * Convert volume (weight × reps) from kg to display unit
 */
export function fromKgVolume(volumeKg: number, toUnit: 'kg' | 'lbs'): number {
  return fromKg(volumeKg, toUnit);
}

/**
 * Format volume for display (e.g., "1.2k lbs")
 */
export function formatVolume(volumeKg: number, toUnit: 'kg' | 'lbs'): string {
  const converted = fromKgVolume(volumeKg, toUnit);
  if (converted >= 1000) {
    return `${(converted / 1000).toFixed(1)}k`;
  }
  return converted.toLocaleString();
}
