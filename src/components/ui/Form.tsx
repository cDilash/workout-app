import { Text, YStack } from 'tamagui';

interface FormLabelProps {
  label: string;
  helper?: string;
  count?: number;
  required?: boolean;
}

/**
 * FormLabel - Consistent label component for forms
 *
 * Provides standardized styling for form field labels with optional:
 * - Helper text (shown below label in muted color)
 * - Count indicator (for multi-select fields)
 * - Required field indicator (asterisk)
 *
 * @example
 * ```tsx
 * <FormLabel
 *   label="Primary Muscles"
 *   count={primaryMuscles.length}
 *   helper="Select the main muscles worked"
 * />
 * ```
 */
export function FormLabel({ label, helper, count, required }: FormLabelProps) {
  return (
    <YStack marginBottom="$2" marginTop="$4">
      <Text fontSize="$3" fontWeight="600" color="#FFFFFF" marginBottom={helper ? "$1" : "$2"}>
        {label}
        {required && <Text color="rgba(255,255,255,0.5)"> *</Text>}
        {count !== undefined && (
          <Text fontWeight="500" color="rgba(255,255,255,0.5)">
            {' '}({count} selected)
          </Text>
        )}
      </Text>
      {helper && (
        <Text fontSize="$1" color="rgba(255,255,255,0.5)">
          {helper}
        </Text>
      )}
    </YStack>
  );
}
