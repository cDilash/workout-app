import { styled, YStack, XStack, Text, GetProps } from 'tamagui';

/**
 * Section Component
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
 * Section Header
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
        <Text fontSize="$6" fontWeight="700" color="$color">
          {title}
        </Text>
        {subtitle && (
          <Text fontSize="$2" color="$colorMuted">
            {subtitle}
          </Text>
        )}
      </YStack>
      {action}
    </XStack>
  );
}

/**
 * Section Title (Standalone)
 */
export const SectionTitle = styled(Text, {
  name: 'SectionTitle',
  fontSize: '$6',
  fontWeight: '700',
  color: '$color',
});

/**
 * Section Subtitle
 */
export const SectionSubtitle = styled(Text, {
  name: 'SectionSubtitle',
  fontSize: '$2',
  color: '$colorMuted',
});

/**
 * Empty State
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
        <Text fontSize="$5" fontWeight="600" color="$color" textAlign="center">
          {title}
        </Text>
        {description && (
          <Text fontSize="$3" color="$colorMuted" textAlign="center">
            {description}
          </Text>
        )}
      </YStack>
      {action}
    </YStack>
  );
}
