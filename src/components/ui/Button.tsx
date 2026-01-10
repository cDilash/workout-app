import { styled, XStack, Text, GetProps } from 'tamagui';

/**
 * Button Component - Premium Monochromatic
 *
 * Square/rectangular buttons with rounded corners.
 * Clean, minimal aesthetic - no colored variants.
 */
export const Button = styled(XStack, {
  name: 'Button',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '$2',
  paddingVertical: '$3',
  paddingHorizontal: '$5',
  borderRadius: 12, // Rounded rectangle
  cursor: 'pointer',

  pressStyle: {
    opacity: 0.9,
    scale: 0.98,
  },

  variants: {
    variant: {
      /**
       * Primary - White fill, black text
       */
      primary: {
        backgroundColor: '#FFFFFF',
      },
      /**
       * Secondary - Outline with white border
       */
      secondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.30)',
      },
      /**
       * Ghost - Transparent, subtle hover
       */
      ghost: {
        backgroundColor: 'transparent',
        pressStyle: {
          backgroundColor: 'rgba(255,255,255,0.05)',
        },
      },
      /**
       * Subtle - Very subtle fill
       */
      subtle: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        pressStyle: {
          backgroundColor: 'rgba(255,255,255,0.12)',
        },
      },
      /**
       * Dark - Dark fill for light backgrounds
       */
      dark: {
        backgroundColor: '#000000',
      },
    },
    size: {
      sm: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        minHeight: 40,
      },
      md: {
        paddingVertical: 12,
        paddingHorizontal: 28,
        minHeight: 48,
      },
      lg: {
        paddingVertical: 16,
        paddingHorizontal: 36,
        minHeight: 56,
      },
      xl: {
        paddingVertical: 18,
        paddingHorizontal: 44,
        minHeight: 64,
      },
    },
    fullWidth: {
      true: {
        width: '100%',
      },
    },
    disabled: {
      true: {
        opacity: 0.4,
        cursor: 'not-allowed',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export type ButtonProps = GetProps<typeof Button>;

/**
 * Button Text - Premium Monochromatic
 */
export const ButtonText = styled(Text, {
  name: 'ButtonText',
  fontWeight: '600',
  fontSize: 16,

  variants: {
    variant: {
      primary: {
        color: '#000000', // Black text on white button
      },
      secondary: {
        color: '#FFFFFF',
      },
      ghost: {
        color: 'rgba(255,255,255,0.6)',
      },
      subtle: {
        color: '#FFFFFF',
      },
      dark: {
        color: '#FFFFFF',
      },
    },
    size: {
      sm: {
        fontSize: 14,
      },
      md: {
        fontSize: 16,
      },
      lg: {
        fontSize: 18,
        fontWeight: '600',
      },
      xl: {
        fontSize: 18,
        fontWeight: '700',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

/**
 * Icon Button - Circular button for icons
 */
export const IconButton = styled(XStack, {
  name: 'IconButton',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 9999, // Full circle
  cursor: 'pointer',

  pressStyle: {
    opacity: 0.8,
    scale: 0.95,
  },

  variants: {
    variant: {
      primary: {
        backgroundColor: '#FFFFFF',
      },
      secondary: {
        backgroundColor: 'rgba(255,255,255,0.10)',
      },
      ghost: {
        backgroundColor: 'transparent',
        pressStyle: {
          backgroundColor: 'rgba(255,255,255,0.08)',
        },
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.20)',
      },
    },
    size: {
      sm: {
        width: 36,
        height: 36,
      },
      md: {
        width: 44,
        height: 44,
      },
      lg: {
        width: 52,
        height: 52,
      },
      xl: {
        width: 64,
        height: 64,
      },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});
