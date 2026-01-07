import { styled, YStack, XStack, Text, GetProps } from 'tamagui';

/**
 * Section Component - Premium Monochromatic
 *
 * Container for grouping related content with consistent spacing.
 */
export const Section = styled(YStack, {
  name: 'Section',
  gap: '$3',

  variants: {
    size: {
      sm: {
        gap: '$2',
      },
      md: {
        gap: '$3',
      },
      lg: {
        gap: '$4',
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
});

/**
 * Section Header - Premium Monochromatic
 *
 * Title row with optional action button.
 */
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <XStack justifyContent="space-between" alignItems="center">
      <YStack gap="$1">
        <Text fontSize="$6" fontWeight="600" color="#FFFFFF">
          {title}
        </Text>
        {subtitle && (
          <Text fontSize="$2" color="rgba(255, 255, 255, 0.5)">
            {subtitle}
          </Text>
        )}
      </YStack>
      {action}
    </XStack>
  );
}

/**
 * Section Title (Standalone) - Premium Monochromatic
 */
export const SectionTitle = styled(Text, {
  name: 'SectionTitle',
  fontSize: '$6',
  fontWeight: '600',
  color: '#FFFFFF',
});

/**
 * Section Subtitle - Premium Monochromatic
 */
export const SectionSubtitle = styled(Text, {
  name: 'SectionSubtitle',
  fontSize: '$2',
  color: 'rgba(255, 255, 255, 0.5)',
});

/**
 * Empty State - Premium Monochromatic
 *
 * Placeholder for empty sections.
 */
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <YStack
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$3"
    >
      {icon}
      <YStack alignItems="center" gap="$1">
        <Text fontSize="$5" fontWeight="600" color="#FFFFFF" textAlign="center">
          {title}
        </Text>
        {description && (
          <Text fontSize="$3" color="rgba(255, 255, 255, 0.5)" textAlign="center">
            {description}
          </Text>
        )}
      </YStack>
      {action}
    </YStack>
  );
}
