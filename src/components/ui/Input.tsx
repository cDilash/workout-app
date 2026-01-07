import { styled, XStack } from 'tamagui';
import { TextInput as RNTextInput, TextInputProps } from 'react-native';
import { forwardRef } from 'react';
import { MagnifyingGlass } from 'phosphor-react-native';

/**
 * Input Container - Premium Monochromatic
 */
const InputContainer = styled(XStack, {
  name: 'InputContainer',
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.10)',
  alignItems: 'center',
  paddingHorizontal: '$4',

  focusStyle: {
    borderColor: 'rgba(255,255,255,0.30)',
  },

  variants: {
    size: {
      sm: {
        minHeight: 44,
        borderRadius: 12,
      },
      md: {
        minHeight: 52,
        borderRadius: 16,
      },
      lg: {
        minHeight: 60,
        borderRadius: 20,
      },
    },
    error: {
      true: {
        borderColor: 'rgba(255,255,255,0.40)',
      },
    },
    disabled: {
      true: {
        opacity: 0.4,
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
});

/**
 * Input Component - Premium Monochromatic
 */
interface InputProps extends Omit<TextInputProps, 'style'> {
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<RNTextInput, InputProps>(function Input(
  { size = 'md', error, leftIcon, rightIcon, ...props },
  ref
) {
  const fontSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  return (
    <InputContainer size={size} error={error}>
      {leftIcon}
      <RNTextInput
        ref={ref}
        placeholderTextColor="rgba(255,255,255,0.30)"
        style={{
          flex: 1,
          fontSize,
          color: '#FFFFFF',
          paddingVertical: 14,
          paddingHorizontal: leftIcon ? 12 : 0,
        }}
        {...props}
      />
      {rightIcon}
    </InputContainer>
  );
});

/**
 * Search Input - Premium Monochromatic
 */
interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
  iconColor?: string;
}

export function SearchInput({ iconColor, ...props }: SearchInputProps) {
  const color = iconColor || 'rgba(255,255,255,0.40)';

  return (
    <Input
      leftIcon={<MagnifyingGlass size={20} color={color} />}
      placeholder="Search..."
      returnKeyType="search"
      autoCorrect={false}
      autoCapitalize="none"
      {...props}
    />
  );
}

/**
 * Number Input - For numeric entry
 */
interface NumberInputProps extends Omit<InputProps, 'keyboardType'> {
  decimal?: boolean;
}

export function NumberInput({ decimal = false, ...props }: NumberInputProps) {
  return (
    <Input
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      textAlign="center"
      {...props}
    />
  );
}
