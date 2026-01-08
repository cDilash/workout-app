import { create } from 'zustand';

// Simplified bar types for the numpad calculator (no custom option)
export type BarType = 'olympic' | 'womens' | 'ez';

interface TargetInput {
  exerciseId: string;
  setId: string;
  field: 'weight' | 'reps';
}

interface NumpadStore {
  // Visibility
  isVisible: boolean;

  // Input mode
  mode: 'weight' | 'reps';

  // Current value being edited (string for proper decimal handling)
  currentValue: string;

  // Which input is being edited
  targetInput: TargetInput | null;

  // Plate calculator state
  isPlateCalculatorExpanded: boolean;
  barType: BarType;

  // Actions
  showNumpad: (
    exerciseId: string,
    setId: string,
    field: 'weight' | 'reps',
    initialValue: number | null
  ) => void;
  hideNumpad: () => void;
  appendDigit: (digit: string) => void;
  deleteDigit: () => void;
  clear: () => void;
  applyQuickAdjust: (delta: number) => void;
  togglePlateCalculator: () => void;
  setBarType: (type: BarType) => void;
  setValue: (value: string) => void;
}

// Max decimal places for weight input
const MAX_DECIMAL_PLACES = 2;
// Max digits total (prevent overflow)
const MAX_DIGITS = 6;

export const useNumpadStore = create<NumpadStore>((set, get) => ({
  isVisible: false,
  mode: 'weight',
  currentValue: '',
  targetInput: null,
  isPlateCalculatorExpanded: false,
  barType: 'olympic',

  showNumpad: (exerciseId, setId, field, initialValue) => {
    set({
      isVisible: true,
      mode: field,
      currentValue: initialValue !== null ? String(initialValue) : '',
      targetInput: { exerciseId, setId, field },
      // Collapse plate calculator when opening for new input
      isPlateCalculatorExpanded: false,
    });
  },

  hideNumpad: () => {
    set({
      isVisible: false,
      targetInput: null,
    });
  },

  appendDigit: (digit: string) => {
    const { currentValue, mode } = get();

    // Handle decimal point
    if (digit === '.') {
      // No decimal for reps
      if (mode === 'reps') return;
      // Only one decimal allowed
      if (currentValue.includes('.')) return;
      // Add leading zero if empty
      if (currentValue === '') {
        set({ currentValue: '0.' });
        return;
      }
    }

    // Check max digits (excluding decimal point)
    const digitsOnly = currentValue.replace('.', '');
    if (digitsOnly.length >= MAX_DIGITS) return;

    // Check decimal places
    if (currentValue.includes('.')) {
      const decimalPart = currentValue.split('.')[1] || '';
      if (decimalPart.length >= MAX_DECIMAL_PLACES && digit !== '.') return;
    }

    // Prevent leading zeros (except for "0.")
    if (currentValue === '0' && digit !== '.') {
      set({ currentValue: digit });
      return;
    }

    set({ currentValue: currentValue + digit });
  },

  deleteDigit: () => {
    const { currentValue } = get();
    if (currentValue.length > 0) {
      set({ currentValue: currentValue.slice(0, -1) });
    }
  },

  clear: () => {
    set({ currentValue: '' });
  },

  applyQuickAdjust: (delta: number) => {
    const { currentValue } = get();
    const currentNum = parseFloat(currentValue) || 0;
    const newValue = Math.max(0, currentNum + delta);
    // Format to avoid floating point issues (e.g., 0.1 + 0.2)
    const formatted = Number(newValue.toFixed(2));
    set({ currentValue: String(formatted) });
  },

  togglePlateCalculator: () => {
    set((state) => ({
      isPlateCalculatorExpanded: !state.isPlateCalculatorExpanded,
    }));
  },

  setBarType: (type: BarType) => {
    set({ barType: type });
  },

  setValue: (value: string) => {
    set({ currentValue: value });
  },
}));

/**
 * Helper to convert numpad value to number for storage
 */
export function numpadValueToNumber(value: string): number | null {
  if (value === '' || value === '.') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}
