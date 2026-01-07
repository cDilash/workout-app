import { styled, YStack, GetProps } from 'tamagui';

/**
 * Card Component - Premium Monochromatic
 *
 * Glassmorphic style with subtle borders and generous radius.
 * Clean, minimal aesthetic with gray gradients for depth.
 */
export const Card = styled(YStack, {
  name: 'Card',
  backgroundColor: '#141414',
  borderRadius: 24,
  padding: '$5',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)',

  variants: {
    elevated: {
      true: {
        backgroundColor: '#1a1a1a',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 8,
      },
    },

    pressable: {
      true: {
        cursor: 'pointer',
        pressStyle: {
          scale: 0.98,
          opacity: 0.9,
          backgroundColor: '#1a1a1a',
        },
      },
    },

    size: {
      sm: {
        padding: '$3',
        borderRadius: 16,
      },
      md: {
        padding: '$4',
        borderRadius: 20,
      },
      lg: {
        padding: '$5',
        borderRadius: 24,
      },
      xl: {
        padding: '$6',
        borderRadius: 28,
      },
    },

    /**
     * Style Variants
     */
    variant: {
      default: {},
      // Slightly elevated card
      surface: {
        backgroundColor: '#1a1a1a',
      },
      // More elevated
      elevated: {
        backgroundColor: '#1f1f1f',
      },
      // Ghost - transparent
      ghost: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
      },
      // Outline - transparent with border
      outline: {
        backgroundColor: 'transparent',
        borderColor: 'rgba(255,255,255,0.15)',
      },
    },

    /**
     * Active state - subtle white border highlight
     */
    active: {
      true: {
        borderColor: 'rgba(255,255,255,0.30)',
        borderWidth: 1,
      },
    },

    /**
     * Selected state - white border
     */
    selected: {
      true: {
        borderColor: '#FFFFFF',
        borderWidth: 1,
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
    variant: 'default',
  },
});

export type CardProps = GetProps<typeof Card>;

/**
 * Stat Card - For displaying large numbers/stats
 */
export const StatCard = styled(Card, {
  name: 'StatCard',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: '$6',

  variants: {
    compact: {
      true: {
        paddingVertical: '$4',
      },
    },
  } as const,
});

/**
 * List Card - For list items with horizontal layout
 */
export const ListCard = styled(Card, {
  name: 'ListCard',
  flexDirection: 'row',
  alignItems: 'center',
  padding: '$4',
  gap: '$3',
});
