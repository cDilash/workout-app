import { styled, XStack, Text, GetProps } from 'tamagui';

/**
 * Badge Component
 *
 * Small label for status, counts, or categories.
 */
export const Badge = styled(XStack, {
  name: 'Badge',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$sm',

  variants: {
    variant: {
      default: {
        backgroundColor: '$backgroundStrong',
      },
      primary: {
        backgroundColor: '$primaryMuted',
      },
      success: {
        backgroundColor: '$successMuted',
      },
      warning: {
        backgroundColor: '$warningMuted',
      },
      danger: {
        backgroundColor: '$dangerMuted',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '$borderColor',
      },
    },
    size: {
      sm: {
        paddingHorizontal: 6,
        paddingVertical: 2,
      },
      md: {
        paddingHorizontal: 8,
        paddingVertical: 4,
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
 * Badge Text
 */
export const BadgeText = styled(Text, {
  name: 'BadgeText',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: 0.5,

  variants: {
    variant: {
      default: {
        color: '$colorSubtle',
      },
      primary: {
        color: '$primary',
      },
      success: {
        color: '$success',
      },
      warning: {
        color: '$warning',
      },
      danger: {
        color: '$danger',
      },
      outline: {
        color: '$colorSubtle',
      },
    },
    size: {
      sm: {
        fontSize: 10,
      },
      md: {
        fontSize: 11,
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

/**
 * Chip Component
 *
 * Selectable/filterable tag, larger than badge.
 */
export const Chip = styled(XStack, {
  name: 'Chip',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: '$3',
  paddingVertical: '$2',
  borderRadius: '$chip',
  gap: '$1',
  cursor: 'pointer',

  pressStyle: {
    opacity: 0.8,
  },

  variants: {
    selected: {
      true: {
        backgroundColor: '$primary',
      },
      false: {
        backgroundColor: '$backgroundStrong',
      },
    },
    size: {
      sm: {
        paddingHorizontal: '$2',
        paddingVertical: 6,
      },
      md: {
        paddingHorizontal: '$3',
        paddingVertical: '$2',
      },
    },
  } as const,

  defaultVariants: {
    selected: false,
    size: 'md',
  },
});

export const ChipText = styled(Text, {
  name: 'ChipText',
  fontWeight: '500',

  variants: {
    selected: {
      true: {
        color: 'white',
      },
      false: {
        color: '$color',
      },
    },
    size: {
      sm: {
        fontSize: 12,
      },
      md: {
        fontSize: 13,
      },
    },
  } as const,

  defaultVariants: {
    selected: false,
    size: 'md',
  },
});
