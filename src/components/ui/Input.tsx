import { styled, XStack, GetProps } from 'tamagui';
import { TextInput as RNTextInput, TextInputProps } from 'react-native';
import { forwardRef } from 'react';
import { MagnifyingGlass } from 'phosphor-react-native';

/**
 * Input Container
 *
 * Styled wrapper for input fields.
 */
const InputContainer = styled(XStack, {
  name: 'InputContainer',
  backgroundColor: '$inputBackground',
  borderRadius: '$input',
  borderWidth: 1,
  borderColor: '$inputBorder',
  alignItems: 'center',
  paddingHorizontal: '$3',

  focusStyle: {
    borderColor: '$primary',
  },

  variants: {
    size: {
      sm: {
        minHeight: 40,
      },
      md: {
        minHeight: 48,
      },
      lg: {
        minHeight: 56,
      },
    },
    error: {
      true: {
        borderColor: '$danger',
      },
    },
    disabled: {
      true: {
        opacity: 0.6,
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
});

/**
 * Input Component
 *
 * A styled text input using Tamagui tokens.
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
        placeholderTextColor="#a1a1aa"
        style={{
          flex: 1,
          fontSize,
          color: '#18181b',
          paddingVertical: 12,
          paddingHorizontal: leftIcon ? 8 : 0,
        }}
        {...props}
      />
      {rightIcon}
    </InputContainer>
  );
});

/**
 * Search Input
 *
 * Specialized input for search with built-in icon.
 */
interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
  iconColor?: string;
}

export function SearchInput({ iconColor = '#a1a1aa', ...props }: SearchInputProps) {
  return (
    <Input
      leftIcon={<MagnifyingGlass size={20} color={iconColor} />}
      placeholder="Search..."
      returnKeyType="search"
      autoCorrect={false}
      autoCapitalize="none"
      {...props}
    />
  );
}

/**
 * Number Input
 *
 * Optimized for numeric entry (weights, reps).
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
