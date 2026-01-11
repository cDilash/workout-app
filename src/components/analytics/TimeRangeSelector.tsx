import { Modal, Platform, Pressable } from 'react-native';
import { XStack, Text, YStack, Button } from 'tamagui';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Funnel } from 'phosphor-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

export type TimeRange = '1W' | '4W' | '8W' | '3M' | '6M' | '1Y' | 'ALL' | 'CUSTOM';

interface TimeRangeOption {
  value: TimeRange;
  label: string;
  days: number | null; // null = all time
}

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: '1W', label: '1W', days: 7 },
  { value: '4W', label: '4W', days: 28 },
  { value: '8W', label: '8W', days: 56 },
  { value: '3M', label: '3M', days: 90 },
  { value: '6M', label: '6M', days: 180 },
  { value: '1Y', label: '1Y', days: 365 },
  { value: 'ALL', label: 'All', days: null },
];

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  /** Optional: Limit which options to show */
  options?: TimeRange[];
  /** Optional: Custom date range (for CUSTOM mode) */
  customDateRange?: { start: Date; end: Date };
  /** Optional: Callback when custom dates are set */
  onCustomDateChange?: (start: Date, end: Date) => void;
}

/**
 * TimeRangeSelector - Chip-based time filter
 *
 * Allows users to select a time range for analytics visualizations.
 * All charts that use this should filter their data accordingly.
 *
 * Usage:
 * ```tsx
 * const [range, setRange] = useState<TimeRange>('4W');
 * <TimeRangeSelector value={range} onChange={setRange} />
 * ```
 */
export function TimeRangeSelector({
  value,
  onChange,
  options,
  customDateRange,
  onCustomDateChange,
}: TimeRangeSelectorProps) {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [step, setStep] = useState<'start' | 'end'>('start');
  const [tempStartDate, setTempStartDate] = useState(customDateRange?.start || new Date());
  const [tempEndDate, setTempEndDate] = useState(customDateRange?.end || new Date());

  const availableOptions = options
    ? TIME_RANGE_OPTIONS.filter((opt) => options.includes(opt.value))
    : TIME_RANGE_OPTIONS;

  const handleSelect = (range: TimeRange) => {
    if (range !== value) {
      Haptics.selectionAsync();
      onChange(range);
    }
  };

  const handleOpenFilter = () => {
    Haptics.selectionAsync();
    setStep('start');
    setShowFilterModal(true);
  };

  const handleNextToEndDate = () => {
    Haptics.selectionAsync();
    setStep('end');
  };

  const handleBackToStartDate = () => {
    Haptics.selectionAsync();
    setStep('start');
  };

  const handleApplyCustom = () => {
    if (onCustomDateChange) {
      onCustomDateChange(tempStartDate, tempEndDate);
      onChange('CUSTOM');
    }
    setShowFilterModal(false);
    setStep('start'); // Reset for next time
  };

  const handleCancel = () => {
    setShowFilterModal(false);
    setStep('start'); // Reset for next time
  };

  const isCustomSelected = value === 'CUSTOM';

  return (
    <>
      <XStack gap="$2" justifyContent="center" flexWrap="wrap">
        {availableOptions.map((option) => {
          const isSelected = value === option.value;
          return (
            <XStack
              key={option.value}
              paddingHorizontal={12}
              paddingVertical={8}
              borderRadius={8}
              borderWidth={1}
              borderColor={isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.15)'}
              backgroundColor={isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.04)'}
              onPress={() => handleSelect(option.value)}
              pressStyle={{ opacity: 0.7, scale: 0.98 }}
              accessibilityLabel={`Select ${option.label} time range`}
              accessibilityRole="button"
              flexShrink={1}
            >
              <Text
                fontSize={13}
                fontWeight="600"
                color={isSelected ? '#000000' : '#FFFFFF'}
              >
                {option.label}
              </Text>
            </XStack>
          );
        })}

        {/* Custom Filter Button */}
        <XStack
          paddingHorizontal={10}
          paddingVertical={8}
          borderRadius={8}
          borderWidth={1}
          borderColor={isCustomSelected ? '#FFFFFF' : 'rgba(255,255,255,0.15)'}
          backgroundColor={isCustomSelected ? '#FFFFFF' : 'rgba(255,255,255,0.04)'}
          onPress={handleOpenFilter}
          pressStyle={{ opacity: 0.7, scale: 0.98 }}
          alignItems="center"
          gap={4}
          flexShrink={1}
        >
          <Funnel
            size={14}
            color={isCustomSelected ? '#000000' : '#FFFFFF'}
            weight="bold"
          />
          {isCustomSelected && customDateRange && (
            <Text
              fontSize={10}
              fontWeight="600"
              color="#000000"
            >
              {format(customDateRange.start, 'M/d')}-{format(customDateRange.end, 'M/d')}
            </Text>
          )}
        </XStack>
      </XStack>

      {/* Custom Date Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}
          onPress={handleCancel}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <YStack
              backgroundColor="#1A1A1A"
              borderRadius={16}
              paddingVertical="$4"
              width={340}
              borderWidth={1}
              borderColor="rgba(255,255,255,0.1)"
              gap="$3"
            >
            <Text fontSize="$5" fontWeight="600" color="#FFFFFF" paddingHorizontal="$4">
              {step === 'start' ? 'Select Start Date' : 'Select End Date'}
            </Text>

            {/* Step 1: Start Date */}
            {step === 'start' && (
              <YStack gap="$3">
                <DateTimePicker
                  value={tempStartDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    if (date) setTempStartDate(date);
                  }}
                  maximumDate={new Date()}
                  themeVariant="dark"
                />

                {/* Action Buttons */}
                <XStack gap="$2" marginTop="$2" paddingHorizontal="$4">
                  <Button
                    flex={1}
                    onPress={handleCancel}
                    backgroundColor="rgba(255,255,255,0.1)"
                    borderWidth={1}
                    borderColor="rgba(255,255,255,0.2)"
                    pressStyle={{ opacity: 0.7 }}
                  >
                    <Text color="#FFFFFF" fontWeight="600">
                      Cancel
                    </Text>
                  </Button>
                  <Button
                    flex={1}
                    onPress={handleNextToEndDate}
                    backgroundColor="#FFFFFF"
                    pressStyle={{ opacity: 0.7 }}
                  >
                    <Text color="#000000" fontWeight="600">
                      Next
                    </Text>
                  </Button>
                </XStack>
              </YStack>
            )}

            {/* Step 2: End Date */}
            {step === 'end' && (
              <YStack gap="$3">
                <DateTimePicker
                  value={tempEndDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    if (date) setTempEndDate(date);
                  }}
                  minimumDate={tempStartDate}
                  maximumDate={new Date()}
                  themeVariant="dark"
                />

                {/* Selected Range Summary */}
                <YStack
                  backgroundColor="rgba(255,255,255,0.06)"
                  padding="$3"
                  borderRadius={8}
                  borderWidth={1}
                  borderColor="rgba(255,255,255,0.1)"
                  marginHorizontal="$4"
                >
                  <Text fontSize={11} color="rgba(255,255,255,0.5)" marginBottom={4}>
                    Date Range
                  </Text>
                  <Text fontSize="$3" color="#FFFFFF" fontWeight="600">
                    {format(tempStartDate, 'MMM d, yyyy')} - {format(tempEndDate, 'MMM d, yyyy')}
                  </Text>
                </YStack>

                {/* Action Buttons */}
                <XStack gap="$2" marginTop="$2" paddingHorizontal="$4">
                  <Button
                    flex={1}
                    onPress={handleBackToStartDate}
                    backgroundColor="rgba(255,255,255,0.1)"
                    borderWidth={1}
                    borderColor="rgba(255,255,255,0.2)"
                    pressStyle={{ opacity: 0.7 }}
                  >
                    <Text color="#FFFFFF" fontWeight="600">
                      Back
                    </Text>
                  </Button>
                  <Button
                    flex={1}
                    onPress={handleApplyCustom}
                    backgroundColor="#FFFFFF"
                    pressStyle={{ opacity: 0.7 }}
                  >
                    <Text color="#000000" fontWeight="600">
                      Apply
                    </Text>
                  </Button>
                </XStack>
              </YStack>
            )}
          </YStack>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/**
 * Get the number of days for a time range
 * Returns null for 'ALL' (meaning no date filter)
 */
export function getTimeRangeDays(range: TimeRange): number | null {
  const option = TIME_RANGE_OPTIONS.find((opt) => opt.value === range);
  return option?.days ?? null;
}

/**
 * Get start date for a time range (from today)
 * Returns null for 'ALL' (meaning no date filter)
 */
export function getTimeRangeStartDate(range: TimeRange): Date | null {
  const days = getTimeRangeDays(range);
  if (days === null) return null;

  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

export { TIME_RANGE_OPTIONS };
