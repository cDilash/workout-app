/**
 * Plate Calculator Utility
 *
 * Calculates which plates to load on each side of the barbell
 * to achieve a target weight.
 */

// Standard plate weights in lbs
export const PLATES_LBS = [45, 35, 25, 10, 5, 2.5] as const;

// Standard plate weights in kg
export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

// Common bar weights
export const BAR_WEIGHTS = {
  lbs: {
    olympic: 45,
    womens: 35,
    ez: 25,
    smith: 15, // Bar weight varies, often counterbalanced
  },
  kg: {
    olympic: 20,
    womens: 15,
    ez: 10,
    smith: 7,
  },
} as const;

export type BarType = 'olympic' | 'womens' | 'ez' | 'smith' | 'custom';

export interface PlateResult {
  plate: number;
  count: number;
}

export interface CalculationResult {
  /** Plates to load on EACH side of the bar */
  platesPerSide: PlateResult[];
  /** Total weight achieved (bar + all plates) */
  totalWeight: number;
  /** Weight on each side (plates only) */
  weightPerSide: number;
  /** The bar weight used */
  barWeight: number;
  /** If the exact target couldn't be reached */
  isApproximate: boolean;
  /** Difference from target (positive = over, negative = under) */
  difference: number;
}

/**
 * Calculate plates needed to achieve target weight
 *
 * @param targetWeight - The total weight you want on the bar
 * @param barWeight - Weight of the empty bar
 * @param unit - 'lbs' or 'kg'
 * @param availablePlates - Optional custom plate set
 * @returns Calculation result with plates per side
 */
export function calculatePlates(
  targetWeight: number,
  barWeight: number,
  unit: 'lbs' | 'kg',
  availablePlates?: number[]
): CalculationResult {
  const plates = availablePlates ?? (unit === 'lbs' ? [...PLATES_LBS] : [...PLATES_KG]);

  // Weight that needs to be added via plates (total for both sides)
  const weightToAdd = targetWeight - barWeight;

  // If target is less than or equal to bar weight, no plates needed
  if (weightToAdd <= 0) {
    return {
      platesPerSide: [],
      totalWeight: barWeight,
      weightPerSide: 0,
      barWeight,
      isApproximate: targetWeight < barWeight,
      difference: barWeight - targetWeight,
    };
  }

  // Weight per side (we need to split equally)
  let remainingPerSide = weightToAdd / 2;
  const platesPerSide: PlateResult[] = [];

  // Greedy algorithm: start with largest plate
  for (const plate of plates.sort((a, b) => b - a)) {
    if (remainingPerSide >= plate) {
      const count = Math.floor(remainingPerSide / plate);
      if (count > 0) {
        platesPerSide.push({ plate, count });
        remainingPerSide -= plate * count;
      }
    }
  }

  // Calculate actual achieved weight
  const actualWeightPerSide = platesPerSide.reduce(
    (sum, { plate, count }) => sum + plate * count,
    0
  );
  const totalWeight = barWeight + actualWeightPerSide * 2;

  return {
    platesPerSide,
    totalWeight,
    weightPerSide: actualWeightPerSide,
    barWeight,
    isApproximate: Math.abs(totalWeight - targetWeight) > 0.01,
    difference: totalWeight - targetWeight,
  };
}

/**
 * Get the default bar weight for a given type and unit
 */
export function getBarWeight(barType: BarType, unit: 'lbs' | 'kg', customWeight?: number): number {
  if (barType === 'custom' && customWeight !== undefined) {
    return customWeight;
  }
  return BAR_WEIGHTS[unit][barType === 'custom' ? 'olympic' : barType];
}

/**
 * Format plate count for display
 * e.g., "2 × 45" or "1 × 25"
 */
export function formatPlateCount(plate: number, count: number, unit: 'lbs' | 'kg'): string {
  return `${count} × ${plate}${unit}`;
}

/**
 * Get total plate count (for both sides)
 */
export function getTotalPlateCount(platesPerSide: PlateResult[]): number {
  return platesPerSide.reduce((sum, { count }) => sum + count * 2, 0);
}

/**
 * Get a color for each plate size (for visual representation)
 * Standard gym plate colors
 */
export function getPlateColor(plateWeight: number, unit: 'lbs' | 'kg'): string {
  // Convert to kg for color mapping (international standard)
  const weightInKg = unit === 'lbs' ? plateWeight * 0.453592 : plateWeight;

  if (weightInKg >= 24) return '#E53935'; // Red - 25kg / 55lbs
  if (weightInKg >= 19) return '#1E88E5'; // Blue - 20kg / 45lbs
  if (weightInKg >= 14) return '#FDD835'; // Yellow - 15kg / 35lbs
  if (weightInKg >= 9) return '#43A047';  // Green - 10kg / 25lbs
  if (weightInKg >= 4) return '#FFFFFF';  // White - 5kg / 10lbs
  if (weightInKg >= 2) return '#E53935';  // Red - 2.5kg / 5lbs
  return '#757575'; // Gray - smaller plates
}

/**
 * Get plate width for visual representation (relative to largest plate)
 */
export function getPlateWidth(plateWeight: number, unit: 'lbs' | 'kg'): number {
  const weightInKg = unit === 'lbs' ? plateWeight * 0.453592 : plateWeight;

  // Width ranges from 8 to 24 based on weight
  const minWidth = 8;
  const maxWidth = 24;
  const maxWeight = 25; // kg

  const ratio = Math.min(weightInKg / maxWeight, 1);
  return minWidth + (maxWidth - minWidth) * ratio;
}
