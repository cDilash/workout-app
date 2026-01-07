import { styled, YStack, GetProps } from 'tamagui';
import { BlurView } from 'expo-blur';
import { Platform } from 'react-native';

/**
 * Base Card Component
 *
 * A flexible card with Bento-style aesthetics.
 * Supports elevation, borders, and press animations.
 */
export const Card = styled(YStack, {
  name: 'Card',
  backgroundColor: '$cardBackground',
  borderRadius: '$card',
  padding: '$4',
  borderWidth: 1,
  borderColor: '$borderColor',

  variants: {
    elevated: {
      true: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    },
    pressable: {
      true: {
        cursor: 'pointer',
        pressStyle: {
          scale: 0.98,
          opacity: 0.9,
        },
      },
    },
    size: {
      sm: {
        padding: '$3',
      },
      md: {
        padding: '$4',
      },
      lg: {
        padding: '$5',
      },
    },
    variant: {
      default: {},
      success: {
        backgroundColor: '$successMuted',
        borderColor: '$success',
      },
      warning: {
        backgroundColor: '$warningMuted',
        borderColor: '$warning',
      },
      danger: {
        backgroundColor: '$dangerMuted',
        borderColor: '$danger',
      },
      primary: {
        backgroundColor: '$primaryMuted',
        borderColor: '$primary',
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
 * Glass Card Component
 *
 * Combines Card styling with BlurView for glassmorphism effect.
 * Falls back to semi-transparent background on Android.
 */
interface GlassCardProps extends Omit<CardProps, 'backgroundColor'> {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  children: React.ReactNode;
}

export function GlassCard({
  children,
  intensity = 50,
  tint = 'light',
  ...props
}: GlassCardProps) {
  // BlurView works best on iOS
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={intensity}
        tint={tint}
        style={{
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <Card
          backgroundColor="$background050"
          borderColor="$borderColor"
          {...props}
        >
          {children}
        </Card>
      </BlurView>
    );
  }

  // Fallback for Android: semi-transparent background
  return (
    <Card backgroundColor="$background075" {...props}>
      {children}
    </Card>
  );
}
