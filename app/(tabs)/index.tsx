import { useState, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Plus, Folder, Clock, Barbell } from 'phosphor-react-native';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { YStack, XStack, Text } from 'tamagui';

import { useWorkoutHistory } from '@/src/hooks/useWorkoutHistory';
import { useTemplates, markTemplateUsed, type WorkoutTemplate } from '@/src/hooks/useTemplates';
import { useWorkoutStore } from '@/src/stores/workoutStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { TemplatesModal } from '@/src/components/workout/TemplatesModal';
import { Button, ButtonText, Card, MiniStat, StatNumber } from '@/src/components/ui';
import { HomeHeader } from '@/src/components/header';
import { ProfileModal, SettingsModal, BodyMeasurementsModal } from '@/src/components/modals';
import {
  MuscleRecoveryCard,
  TodaySuggestionCard,
  RecentPRsCard,
  ActiveWorkoutBanner,
  WeeklyActivityCard,
} from '@/src/components/home';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}

export default function HomeScreen() {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const { workouts } = useWorkoutHistory();
  const { templates } = useTemplates();
  const { startWorkoutFromTemplate } = useWorkoutStore();
  const { userName } = useSettingsStore();

  const greeting = useMemo(() => getGreeting(), []);
  const personalizedGreeting = userName ? `${greeting}, ${userName}` : greeting;
  const recentWorkouts = workouts.slice(0, 3);
  const recentTemplates = templates.slice(0, 3);

  const handleStartEmpty = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/workout/new');
  };

  const handleSelectTemplate = async (
    exercises: any[],
    templateName: string,
    templateId: string
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await markTemplateUsed(templateId);
    startWorkoutFromTemplate(exercises, templateName);
    router.push('/workout/new');
  };

  const handleQuickStartTemplate = async (template: WorkoutTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { templateToExerciseData } = await import('@/src/hooks/useTemplates');
    const exercises = templateToExerciseData(template);
    await markTemplateUsed(template.id);
    startWorkoutFromTemplate(exercises, template.name);
    router.push('/workout/new');
  };

  return (
    <YStack flex={1} backgroundColor="#000000">
      <HomeHeader
        onProfilePress={() => setShowProfile(true)}
        onSettingsPress={() => setShowSettings(true)}
        onMeasurementsPress={() => setShowMeasurements(true)}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
      >
        {/* Hero Section */}
        <YStack marginBottom="$6" marginTop="$4">
          <Text
            fontSize={28}
            fontWeight="300"
            color="#FFFFFF"
            letterSpacing={-0.5}
          >
            {personalizedGreeting}
          </Text>
          <Text
            fontSize={14}
            fontWeight="500"
            color="rgba(255,255,255,0.5)"
            marginTop="$1"
          >
            Ready to train?
          </Text>
        </YStack>

        {/* Main CTA - White Pill */}
        <Button
          variant="primary"
          size="xl"
          fullWidth
          marginBottom="$4"
          onPress={handleStartEmpty}
          accessibilityLabel="Start empty workout"
          accessibilityRole="button"
        >
          <Plus size={22} color="#000000" weight="bold" />
          <ButtonText variant="primary" size="xl">
            Start Workout
          </ButtonText>
        </Button>

        {/* Secondary Actions */}
        <XStack gap="$3" marginBottom="$6">
          <Button
            variant="secondary"
            size="lg"
            flex={1}
            onPress={() => {
              Haptics.selectionAsync();
              setShowTemplates(true);
            }}
            accessibilityLabel="Open workout templates"
            accessibilityRole="button"
          >
            <Folder size={20} color="#FFFFFF" />
            <ButtonText variant="secondary" size="lg">
              Templates
            </ButtonText>
          </Button>

          <Button
            variant="secondary"
            size="lg"
            flex={1}
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/(tabs)/history');
            }}
            accessibilityLabel="View workout history"
            accessibilityRole="button"
          >
            <Clock size={20} color="#FFFFFF" />
            <ButtonText variant="secondary" size="lg">
              History
            </ButtonText>
          </Button>
        </XStack>

        {/* Active Workout Banner */}
        <ActiveWorkoutBanner />

        {/* Today's Suggestion */}
        <YStack marginBottom="$4">
          <TodaySuggestionCard
            onStartWorkout={(type) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              // For now, start empty workout - could filter templates by type later
              router.push('/workout/new');
            }}
          />
        </YStack>

        {/* Muscle Recovery Map */}
        <YStack marginBottom="$4">
          <MuscleRecoveryCard />
        </YStack>

        {/* Weekly Activity (Streak + Stats) */}
        <YStack marginBottom="$4">
          <WeeklyActivityCard />
        </YStack>

        {/* Recent PRs */}
        <YStack marginBottom="$4">
          <RecentPRsCard
            onSeeAll={() => {
              Haptics.selectionAsync();
              router.push('/(tabs)/progress');
            }}
          />
        </YStack>

        {/* Quick Start Templates */}
        {recentTemplates.length > 0 && (
          <YStack marginBottom="$8">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
              <Text
                fontSize={14}
                fontWeight="600"
                color="rgba(255,255,255,0.5)"
                textTransform="uppercase"
                letterSpacing={1}
              >
                Quick Start
              </Text>
              <Text
                fontSize={14}
                fontWeight="500"
                color="#FFFFFF"
                pressStyle={{ opacity: 0.6 }}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowTemplates(true);
                }}
                accessibilityLabel="See all templates"
                accessibilityRole="button"
              >
                See All
              </Text>
            </XStack>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {recentTemplates.map((template) => (
                <Card
                  key={template.id}
                  pressable
                  width={160}
                  onPress={() => handleQuickStartTemplate(template)}
                  accessibilityLabel={`Start ${template.name} workout`}
                  accessibilityRole="button"
                >
                  <YStack gap="$3">
                    <YStack
                      width={40}
                      height={40}
                      borderRadius={10}
                      backgroundColor="rgba(255,255,255,0.08)"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Barbell size={20} color="#FFFFFF" />
                    </YStack>
                    <YStack>
                      <Text
                        fontSize={16}
                        fontWeight="600"
                        color="#FFFFFF"
                        numberOfLines={1}
                      >
                        {template.name}
                      </Text>
                      <Text fontSize={13} fontWeight="400" color="rgba(255,255,255,0.5)" marginTop={4}>
                        {template.exercises.length} exercises
                      </Text>
                    </YStack>
                  </YStack>
                </Card>
              ))}
            </ScrollView>
          </YStack>
        )}

        {/* Recent Workouts */}
        <YStack>
          <Text
            fontSize={14}
            fontWeight="600"
            color="rgba(255,255,255,0.5)"
            textTransform="uppercase"
            letterSpacing={1}
            marginBottom="$4"
          >
            Recent Workouts
          </Text>
          {recentWorkouts.length === 0 ? (
            <Card>
              <YStack alignItems="center" paddingVertical="$6">
                <Text fontSize={16} fontWeight="500" color="rgba(255,255,255,0.6)" marginBottom="$2">
                  No workouts yet
                </Text>
                <Text fontSize={14} color="rgba(255,255,255,0.4)">
                  Start your first workout to see it here!
                </Text>
              </YStack>
            </Card>
          ) : (
            <YStack gap="$3">
              {recentWorkouts.map((workout) => {
                const durationSecs = workout.completedAt && workout.startedAt
                  ? Math.floor((workout.completedAt.getTime() - workout.startedAt.getTime()) / 1000)
                  : null;

                return (
                  <Card
                    key={workout.id}
                    pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push(`/(tabs)/history`);
                    }}
                  >
                    <XStack
                      justifyContent="space-between"
                      alignItems="center"
                      marginBottom="$4"
                    >
                      <Text fontSize={18} fontWeight="600" color="#FFFFFF">
                        {workout.name || 'Workout'}
                      </Text>
                      <Text fontSize={13} fontWeight="400" color="rgba(255,255,255,0.4)">
                        {formatDistanceToNow(workout.startedAt, { addSuffix: true })}
                      </Text>
                    </XStack>

                    {/* Stats Row */}
                    <XStack justifyContent="space-around">
                      <MiniStat
                        value={workout.exerciseCount.toString()}
                        label="exercises"
                      />
                      <MiniStat
                        value={formatDuration(durationSecs)}
                        label="duration"
                      />
                      <MiniStat
                        value={`${(workout.totalVolume / 1000).toFixed(1)}k`}
                        label="volume"
                      />
                    </XStack>
                  </Card>
                );
              })}
            </YStack>
          )}
        </YStack>

      </ScrollView>

      {/* Modals */}
      <TemplatesModal
        visible={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={handleSelectTemplate}
      />
      <ProfileModal
        visible={showProfile}
        onClose={() => setShowProfile(false)}
      />
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
      <BodyMeasurementsModal
        visible={showMeasurements}
        onClose={() => setShowMeasurements(false)}
      />
    </YStack>
  );
}
