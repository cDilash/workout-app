import React from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import {
  Lightbulb,
  PersonArmsSpread,
  Bed,
  CaretRight,
  Barbell,
} from 'phosphor-react-native';
import { useMuscleRecovery } from '../../hooks/useMuscleRecovery';

/**
 * TodaySuggestionCard Component
 *
 * Shows a smart workout suggestion based on muscle recovery status.
 * Suggests upper, lower, full body, or rest day based on which
 * muscle groups are recovered.
 */

interface TodaySuggestionCardProps {
  onStartWorkout?: (type: 'upper' | 'lower' | 'full' | 'rest') => void;
}

export function TodaySuggestionCard({ onStartWorkout }: TodaySuggestionCardProps) {
  const { suggestion, isLoading } = useMuscleRecovery();

  if (isLoading) {
    return (
      <Card
        padding="$4"
        backgroundColor="rgba(255, 255, 255, 0.05)"
        borderRadius="$4"
        borderWidth={1}
        borderColor="rgba(255, 255, 255, 0.08)"
      >
        <XStack alignItems="center" gap="$2">
          <Lightbulb size={20} color="rgba(255, 255, 255, 0.7)" weight="duotone" />
          <Text fontSize={16} fontWeight="600" color="$color">
            Suggested Today
          </Text>
        </XStack>
        <YStack height={60} alignItems="center" justifyContent="center">
          <Text color="rgba(255, 255, 255, 0.5)">Analyzing...</Text>
        </YStack>
      </Card>
    );
  }

  const config = getSuggestionConfig(suggestion.type);

  return (
    <Card
      padding="$4"
      backgroundColor={config.bgColor}
      borderRadius="$4"
      borderWidth={1}
      borderColor={config.borderColor}
    >
      {/* Header */}
      <XStack alignItems="center" gap="$2" marginBottom="$3">
        <Lightbulb size={20} color={config.accentColor} weight="duotone" />
        <Text fontSize={14} fontWeight="500" color="rgba(255, 255, 255, 0.7)">
          Suggested Today
        </Text>
      </XStack>

      {/* Main Content */}
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap="$3" flex={1}>
          {/* Icon */}
          <YStack
            width={48}
            height={48}
            borderRadius={12}
            backgroundColor={`${config.accentColor}20`}
            alignItems="center"
            justifyContent="center"
          >
            {config.icon}
          </YStack>

          {/* Text */}
          <YStack flex={1}>
            <Text fontSize={18} fontWeight="700" color="$color">
              {suggestion.message}
            </Text>
            <Text
              fontSize={13}
              color="rgba(255, 255, 255, 0.6)"
              marginTop="$1"
              numberOfLines={2}
            >
              {suggestion.reason}
            </Text>
          </YStack>
        </XStack>

        {/* Action Button */}
        {suggestion.type !== 'rest' && onStartWorkout && (
          <Pressable
            onPress={() => onStartWorkout(suggestion.type)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <YStack
              backgroundColor={config.accentColor}
              paddingHorizontal="$4"
              paddingVertical="$2.5"
              borderRadius="$3"
              flexDirection="row"
              alignItems="center"
              gap="$1"
            >
              <Text fontSize={14} fontWeight="600" color="#000000">
                Start
              </Text>
              <CaretRight size={16} color="#000000" weight="bold" />
            </YStack>
          </Pressable>
        )}
      </XStack>

      {/* Fresh Muscles List (if not rest day) */}
      {suggestion.type !== 'rest' && suggestion.freshMuscles.length > 0 && (
        <XStack
          marginTop="$3"
          paddingTop="$3"
          borderTopWidth={1}
          borderTopColor="rgba(255, 255, 255, 0.06)"
          flexWrap="wrap"
          gap="$2"
        >
          {suggestion.freshMuscles.slice(0, 5).map((muscle) => (
            <YStack
              key={muscle}
              backgroundColor="rgba(255, 255, 255, 0.08)"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
            >
              <Text fontSize={11} color="rgba(255, 255, 255, 0.7)">
                {muscle}
              </Text>
            </YStack>
          ))}
          {suggestion.freshMuscles.length > 5 && (
            <YStack
              backgroundColor="rgba(255, 255, 255, 0.05)"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
            >
              <Text fontSize={11} color="rgba(255, 255, 255, 0.5)">
                +{suggestion.freshMuscles.length - 5} more
              </Text>
            </YStack>
          )}
        </XStack>
      )}
    </Card>
  );
}

/**
 * Get styling config based on suggestion type
 */
function getSuggestionConfig(type: 'upper' | 'lower' | 'full' | 'rest') {
  switch (type) {
    case 'upper':
      return {
        bgColor: 'rgba(74, 222, 128, 0.08)',
        borderColor: 'rgba(74, 222, 128, 0.15)',
        accentColor: '#4ADE80',
        icon: <PersonArmsSpread size={24} color="#4ADE80" weight="duotone" />,
      };
    case 'lower':
      return {
        bgColor: 'rgba(96, 165, 250, 0.08)',
        borderColor: 'rgba(96, 165, 250, 0.15)',
        accentColor: '#60A5FA',
        icon: <Barbell size={24} color="#60A5FA" weight="duotone" />,
      };
    case 'full':
      return {
        bgColor: 'rgba(251, 191, 36, 0.08)',
        borderColor: 'rgba(251, 191, 36, 0.15)',
        accentColor: '#FBBF24',
        icon: <PersonArmsSpread size={24} color="#FBBF24" weight="duotone" />,
      };
    case 'rest':
    default:
      return {
        bgColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        accentColor: '#A78BFA',
        icon: <Bed size={24} color="#A78BFA" weight="duotone" />,
      };
  }
}

/**
 * Compact suggestion display for headers or smaller spaces
 */
export function TodaySuggestionBadge() {
  const { suggestion, isLoading } = useMuscleRecovery();

  if (isLoading) {
    return null;
  }

  const config = getSuggestionConfig(suggestion.type);

  // Get small icon for badge based on type
  const getBadgeIcon = () => {
    switch (suggestion.type) {
      case 'upper':
        return <PersonArmsSpread size={14} color={config.accentColor} weight="duotone" />;
      case 'lower':
        return <Barbell size={14} color={config.accentColor} weight="duotone" />;
      case 'full':
        return <PersonArmsSpread size={14} color={config.accentColor} weight="duotone" />;
      case 'rest':
      default:
        return <Bed size={14} color={config.accentColor} weight="duotone" />;
    }
  };

  return (
    <XStack
      backgroundColor={`${config.accentColor}15`}
      paddingHorizontal="$2.5"
      paddingVertical="$1.5"
      borderRadius="$2"
      alignItems="center"
      gap="$1.5"
    >
      {getBadgeIcon()}
      <Text fontSize={12} fontWeight="600" color={config.accentColor}>
        {suggestion.type === 'rest' ? 'Rest Day' : suggestion.message}
      </Text>
    </XStack>
  );
}
