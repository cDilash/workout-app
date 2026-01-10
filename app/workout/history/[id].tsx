import { ScrollView, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { X, ArrowsClockwise, Clock } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { YStack, XStack, Text } from 'tamagui';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

import { useWorkoutDetails, getWorkoutDetails } from '@/src/hooks/useWorkoutHistory';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { useWorkoutStore } from '@/src/stores/workoutStore';
import { fromKgDisplay, fromKgVolume } from '@/src/utils/unitConversion';

/**
 * Workout History Detail Modal
 *
 * Compact popup showing workout details with exercises and sets.
 */

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}

function formatVolume(volumeKg: number, weightUnit: 'kg' | 'lbs'): string {
  const converted = fromKgVolume(volumeKg, weightUnit);
  if (converted >= 1000) {
    return `${(converted / 1000).toFixed(1)}k`;
  }
  return Math.round(converted).toString();
}

export default function WorkoutHistoryDetailModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { workout, isLoading } = useWorkoutDetails(id || null);
  const weightUnit = useSettingsStore((s) => s.weightUnit);
  const { startWorkoutFromTemplate } = useWorkoutStore();

  const handleClose = () => {
    Haptics.selectionAsync();
    router.back();
  };

  const handleRepeatWorkout = async () => {
    if (!id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const details = await getWorkoutDetails(id);
    if (!details) {
      Alert.alert(t('common.error'), 'Could not load workout details');
      return;
    }

    const exercisesForTemplate = details.exercises.map((ex) => ({
      exercise: ex.exercise,
      sets: ex.sets.map((s) => ({
        weight: s.weightKg,
        reps: s.reps,
        isWarmup: s.isWarmup,
      })),
    }));

    startWorkoutFromTemplate(exercisesForTemplate, details.name || t('workout.title'));
    router.replace('/workout/new');
  };

  if (isLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="#000000">
        <Text color="rgba(255,255,255,0.5)">{t('common.loading')}</Text>
      </YStack>
    );
  }

  if (!workout) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="#000000">
        <Text color="rgba(255,255,255,0.5)">{t('history.noWorkouts')}</Text>
      </YStack>
    );
  }

  // Calculate stats
  const durationSecs = workout.completedAt && workout.startedAt
    ? Math.floor((workout.completedAt.getTime() - workout.startedAt.getTime()) / 1000)
    : null;

  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const totalVolume = workout.exercises.reduce((sum, ex) => {
    return sum + ex.sets.reduce((setSum, s) => {
      return setSum + (s.weightKg || 0) * (s.reps || 0);
    }, 0);
  }, 0);

  const dateStr = format(workout.startedAt, 'EEE, MMM d');

  return (
    <YStack flex={1} backgroundColor="#000000">
      {/* Drag Handle */}
      <YStack alignItems="center" paddingTop="$3" paddingBottom="$2">
        <YStack
          width={36}
          height={4}
          backgroundColor="rgba(255, 255, 255, 0.3)"
          borderRadius={2}
        />
      </YStack>

      {/* Compact Header */}
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="$4"
        paddingBottom="$3"
        borderBottomWidth={1}
        borderBottomColor="rgba(255, 255, 255, 0.08)"
      >
        <YStack flex={1}>
          <Text fontSize="$5" fontWeight="700" color="#FFFFFF" numberOfLines={1}>
            {workout.name || t('workout.title')}
          </Text>
          <XStack alignItems="center" gap="$2" marginTop={2}>
            <Text fontSize="$2" color="rgba(255,255,255,0.5)">
              {dateStr}
            </Text>
            <XStack
              backgroundColor="rgba(255, 255, 255, 0.10)"
              paddingHorizontal={6}
              paddingVertical={2}
              borderRadius={10}
              alignItems="center"
              gap={4}
            >
              <Clock size={10} color="#FFFFFF" weight="bold" />
              <Text fontSize="$1" fontWeight="600" color="#FFFFFF">
                {formatDuration(durationSecs)}
              </Text>
            </XStack>
          </XStack>
        </YStack>
        <Pressable onPress={handleClose} hitSlop={12}>
          <YStack
            width={32}
            height={32}
            borderRadius={16}
            backgroundColor="rgba(255, 255, 255, 0.1)"
            alignItems="center"
            justifyContent="center"
          >
            <X size={18} color="#FFFFFF" weight="bold" />
          </YStack>
        </Pressable>
      </XStack>

      {/* Compact Stats Row */}
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        gap="$4"
        borderBottomWidth={1}
        borderBottomColor="rgba(255, 255, 255, 0.08)"
      >
        <YStack alignItems="center" flex={1}>
          <Text fontSize="$6" fontWeight="700" color="#FFFFFF">
            {workout.exercises.length}
          </Text>
          <Text fontSize="$1" color="rgba(255,255,255,0.5)">
            {t('history.stats.exercises')}
          </Text>
        </YStack>
        <YStack alignItems="center" flex={1}>
          <Text fontSize="$6" fontWeight="700" color="#FFFFFF">
            {totalSets}
          </Text>
          <Text fontSize="$1" color="rgba(255,255,255,0.5)">
            {t('history.stats.sets')}
          </Text>
        </YStack>
        <YStack alignItems="center" flex={1}>
          <Text fontSize="$6" fontWeight="700" color="#FFFFFF">
            {formatVolume(totalVolume, weightUnit)}
          </Text>
          <Text fontSize="$1" color="rgba(255,255,255,0.5)">
            {weightUnit}
          </Text>
        </YStack>
      </XStack>

      {/* Exercises List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {workout.exercises.map((we) => (
          <YStack
            key={we.id}
            marginBottom="$3"
            padding="$3"
            backgroundColor="rgba(255, 255, 255, 0.04)"
            borderRadius="$3"
            borderWidth={1}
            borderColor="rgba(255, 255, 255, 0.06)"
          >
            {/* Exercise Name */}
            <Text fontSize="$3" fontWeight="600" color="#FFFFFF" marginBottom="$2">
              {we.exercise.name}
            </Text>

            {/* Compact Sets Grid */}
            <YStack gap="$1">
              {we.sets.map((set, idx) => {
                const workingSetNum = we.sets
                  .slice(0, idx)
                  .filter(s => !s.isWarmup)
                  .length + 1;

                return (
                  <XStack
                    key={set.id}
                    alignItems="center"
                    opacity={set.isWarmup ? 0.5 : 1}
                  >
                    {/* Set indicator */}
                    <Text
                      fontSize="$2"
                      fontWeight="600"
                      color={set.isWarmup ? 'rgba(255, 200, 100, 0.9)' : 'rgba(255,255,255,0.4)'}
                      width={24}
                    >
                      {set.isWarmup ? t('workout.warmup') : workingSetNum}
                    </Text>

                    {/* Weight × Reps */}
                    <Text fontSize="$3" fontWeight="500" color="#FFFFFF">
                      {set.weightKg !== null ? fromKgDisplay(set.weightKg, weightUnit) : '-'}
                      <Text color="rgba(255,255,255,0.4)"> {weightUnit} × </Text>
                      {set.reps !== null ? set.reps : '-'}
                    </Text>
                  </XStack>
                );
              })}
            </YStack>

            {/* Exercise Notes (if any) */}
            {we.notes && (
              <Text
                fontSize="$1"
                color="rgba(255,255,255,0.4)"
                fontStyle="italic"
                marginTop="$2"
                numberOfLines={2}
              >
                {we.notes}
              </Text>
            )}
          </YStack>
        ))}

        {/* Workout Notes */}
        {workout.notes && (
          <YStack
            padding="$3"
            backgroundColor="rgba(255, 255, 255, 0.04)"
            borderRadius="$3"
            marginBottom="$3"
          >
            <Text fontSize="$2" color="rgba(255,255,255,0.6)" fontStyle="italic">
              {workout.notes}
            </Text>
          </YStack>
        )}
      </ScrollView>

      {/* Repeat Button - Fixed at bottom */}
      <YStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        borderTopWidth={1}
        borderTopColor="rgba(255, 255, 255, 0.08)"
        backgroundColor="#000000"
      >
        <XStack
          backgroundColor="#FFFFFF"
          borderRadius="$3"
          paddingVertical="$3"
          alignItems="center"
          justifyContent="center"
          gap="$2"
          onPress={handleRepeatWorkout}
          pressStyle={{ opacity: 0.8, scale: 0.98 }}
          cursor="pointer"
        >
          <ArrowsClockwise size={18} color="#000000" weight="bold" />
          <Text fontSize="$3" fontWeight="600" color="#000000">
            {t('history.repeatWorkout')}
          </Text>
        </XStack>
      </YStack>
    </YStack>
  );
}
