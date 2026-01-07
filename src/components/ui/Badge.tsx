import { styled, XStack, Text, GetProps } from 'tamagui';

/**
 * Badge Component - Premium Monochromatic
 *
 * Small label for status, counts, or categories.
 * Clean grayscale styling.
 */
export const Badge = styled(XStack, {
  name: 'Badge',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 8,
  backgroundColor: 'rgba(255,255,255,0.10)',

  variants: {
    variant: {
      default: {
        backgroundColor: 'rgba(255,255,255,0.10)',
      },
      subtle: {
        backgroundColor: 'rgba(255,255,255,0.05)',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.20)',
      },
      solid: {
        backgroundColor: '#FFFFFF',
      },
    },
    size: {
      sm: {
        paddingHorizontal: 8,
        paddingVertical: 2,
      },
      md: {
        paddingHorizontal: 10,
        paddingVertical: 4,
      },
      lg: {
        paddingHorizontal: 14,
        paddingVertical: 6,
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

export type BadgeProps = GetProps<typeof Badge>;

/**
 * Badge Text - Premium Monochromatic
 */
export const BadgeText = styled(Text, {
  name: 'BadgeText',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  color: 'rgba(255,255,255,0.8)',

  variants: {
    variant: {
      default: {
        color: 'rgba(255,255,255,0.8)',
      },
      subtle: {
        color: 'rgba(255,255,255,0.6)',
      },
      outline: {
        color: 'rgba(255,255,255,0.7)',
      },
      solid: {
        color: '#000000',
      },
    },
    size: {
      sm: {
        fontSize: 10,
      },
      md: {
        fontSize: 11,
      },
      lg: {
        fontSize: 12,
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

/**
 * Chip Component - Premium Monochromatic
 *
 * Selectable/filterable tag with pill shape.
 * White when selected, gray when unselected.
 */
export const Chip = styled(XStack, {
  name: 'Chip',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 50, // Full pill
  gap: '$1',
  cursor: 'pointer',

  pressStyle: {
    opacity: 0.8,
    scale: 0.98,
  },

  variants: {
    selected: {
      true: {
        backgroundColor: '#FFFFFF',
      },
      false: {
        backgroundColor: 'rgba(255,255,255,0.08)',
      },
    },
    size: {
      sm: {
        paddingHorizontal: 12,
        paddingVertical: 8,
      },
      md: {
        paddingHorizontal: 16,
        paddingVertical: 10,
      },
      lg: {
        paddingHorizontal: 20,
        paddingVertical: 12,
      },
    },
  } as const,

  defaultVariants: {
    selected: false,
    size: 'md',
  },
});

/**
 * Chip Text - Premium Monochromatic
 */
export const ChipText = styled(Text, {
  name: 'ChipText',
  fontWeight: '500',
  fontSize: 14,

  variants: {
    selected: {
      true: {
        color: '#000000', // Black text on white chip
      },
      false: {
        color: '#FFFFFF',
      },
    },
    size: {
      sm: {
        fontSize: 12,
      },
      md: {
        fontSize: 14,
      },
      lg: {
        fontSize: 16,
      },
    },
  } as const,

  defaultVariants: {
    selected: false,
    size: 'md',
  },
});
