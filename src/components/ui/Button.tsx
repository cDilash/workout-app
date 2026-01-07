import { styled, XStack, Text, GetProps } from 'tamagui';
import { Pressable } from 'react-native';

/**
 * Button Component
 *
 * Primary button with variants for different use cases.
 * Uses Tamagui styling with proper press states.
 */
export const Button = styled(XStack, {
  name: 'Button',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '$2',
  paddingVertical: '$3',
  paddingHorizontal: '$4',
  borderRadius: '$button',
  cursor: 'pointer',

  pressStyle: {
    opacity: 0.85,
    scale: 0.98,
  },

  variants: {
    variant: {
      primary: {
        backgroundColor: '$primary',
      },
      secondary: {
        backgroundColor: '$backgroundStrong',
        borderWidth: 1,
        borderColor: '$borderColor',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '$primary',
      },
      ghost: {
        backgroundColor: 'transparent',
      },
      success: {
        backgroundColor: '$success',
      },
      danger: {
        backgroundColor: '$danger',
      },
      warning: {
        backgroundColor: '$warning',
      },
    },
    size: {
      sm: {
        paddingVertical: '$2',
        paddingHorizontal: '$3',
        minHeight: 36,
      },
      md: {
        paddingVertical: '$3',
        paddingHorizontal: '$4',
        minHeight: 44,
      },
      lg: {
        paddingVertical: '$4',
        paddingHorizontal: '$5',
        minHeight: 52,
      },
    },
    fullWidth: {
      true: {
        width: '100%',
      },
    },
    disabled: {
      true: {
        opacity: 0.5,
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
 * Button Text
 *
 * Text styled for use inside buttons.
 */
export const ButtonText = styled(Text, {
  name: 'ButtonText',
  fontWeight: '600',
  fontSize: '$4',

  variants: {
    variant: {
      primary: {
        color: 'white',
      },
      secondary: {
        color: '$color',
      },
      outline: {
        color: '$primary',
      },
      ghost: {
        color: '$primary',
      },
      success: {
        color: 'white',
      },
      danger: {
        color: 'white',
      },
      warning: {
        color: 'white',
      },
    },
    size: {
      sm: {
        fontSize: '$3',
      },
      md: {
        fontSize: '$4',
      },
      lg: {
        fontSize: '$5',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

/**
 * Icon Button
 *
 * Circular button for icon-only actions.
 */
export const IconButton = styled(XStack, {
  name: 'IconButton',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '$full',
  cursor: 'pointer',

  pressStyle: {
    opacity: 0.7,
    scale: 0.95,
  },

  variants: {
    variant: {
      primary: {
        backgroundColor: '$primary',
      },
      secondary: {
        backgroundColor: '$backgroundStrong',
      },
      ghost: {
        backgroundColor: 'transparent',
      },
      danger: {
        backgroundColor: '$danger',
      },
    },
    size: {
      sm: {
        width: 32,
        height: 32,
      },
      md: {
        width: 44,
        height: 44,
      },
      lg: {
        width: 56,
        height: 56,
      },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});
