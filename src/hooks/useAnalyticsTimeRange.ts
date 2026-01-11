import { create } from 'zustand';
import { subDays } from 'date-fns';
import type { TimeRange } from '@/src/components/analytics';

/**
 * Global analytics time range state
 *
 * This store manages the selected time range for all analytics visualizations.
 * When the user changes the time range, all charts that use this hook will
 * automatically re-render with the new filtered data.
 *
 * @example
 * ```tsx
 * // In a component:
 * const { range, setRange, startDate } = useAnalyticsTimeRange();
 *
 * // Filter your data:
 * const filteredData = data.filter(d =>
 *   startDate ? d.date >= startDate : true
 * );
 * ```
 */

interface AnalyticsTimeRangeState {
  /** Currently selected time range */
  range: TimeRange;
  /** Set the time range */
  setRange: (range: TimeRange) => void;
  /** Custom date range (for CUSTOM mode) */
  customDateRange: { start: Date; end: Date } | null;
  /** Set custom date range */
  setCustomDateRange: (start: Date, end: Date) => void;
}

// Map time range to number of days (null = all time)
const TIME_RANGE_DAYS: Record<TimeRange, number | null> = {
  '1W': 7,
  '4W': 28,
  '8W': 56,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
  'ALL': null,
  'CUSTOM': null, // Will use customDateRange instead
};

export const useAnalyticsTimeRangeStore = create<AnalyticsTimeRangeState>((set) => ({
  range: '4W', // Default to 4 weeks
  setRange: (range) => set({ range }),
  customDateRange: null,
  setCustomDateRange: (start, end) => set({ customDateRange: { start, end } }),
}));

/**
 * Hook to access and manage the global analytics time range
 *
 * Returns:
 * - range: The current time range selection
 * - setRange: Function to change the time range
 * - startDate: The start date for filtering (null if 'ALL')
 * - endDate: Today's date
 * - days: Number of days in the range (null if 'ALL')
 */
export function useAnalyticsTimeRange() {
  const range = useAnalyticsTimeRangeStore((s) => s.range);
  const setRange = useAnalyticsTimeRangeStore((s) => s.setRange);
  const customDateRange = useAnalyticsTimeRangeStore((s) => s.customDateRange);
  const setCustomDateRange = useAnalyticsTimeRangeStore((s) => s.setCustomDateRange);

  // Use custom dates if CUSTOM range is selected
  let startDate: Date | null = null;
  let endDate = new Date();
  let days: number | null = null;

  if (range === 'CUSTOM' && customDateRange) {
    startDate = new Date(customDateRange.start);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(customDateRange.end);
    endDate.setHours(23, 59, 59, 999);
    days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  } else {
    days = TIME_RANGE_DAYS[range];
    endDate.setHours(23, 59, 59, 999);

    startDate = days !== null ? subDays(new Date(), days) : null;
    if (startDate) {
      startDate.setHours(0, 0, 0, 0);
    }
  }

  return {
    range,
    setRange,
    startDate,
    endDate,
    days,
    customDateRange,
    setCustomDateRange,
  };
}

/**
 * Get the number of weeks for a time range
 * Useful for weekly aggregation hooks
 */
export function getTimeRangeWeeks(range: TimeRange): number | null {
  const days = TIME_RANGE_DAYS[range];
  if (days === null) return null;
  return Math.ceil(days / 7);
}

/**
 * Filter an array of items by date within the time range
 *
 * @param items - Array of items with a date property
 * @param getDate - Function to extract the date from an item
 * @param startDate - Start date (null = no filter)
 * @returns Filtered array
 */
export function filterByTimeRange<T>(
  items: T[],
  getDate: (item: T) => Date,
  startDate: Date | null
): T[] {
  if (!startDate) return items;
  return items.filter((item) => getDate(item) >= startDate);
}
