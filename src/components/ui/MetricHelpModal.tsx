import { Modal, Pressable, ScrollView, View, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Info, Calculator, Lightbulb } from 'phosphor-react-native';
import { YStack, XStack, Text } from 'tamagui';

const { height: screenHeight } = Dimensions.get('window');

import { Card } from './Card';

/**
 * Metric help content definitions
 *
 * Each metric has:
 * - title: Display name
 * - description: What it measures
 * - calculation: How it's calculated (formula)
 * - tip: Practical advice for the user
 */
export interface MetricHelp {
  title: string;
  description: string;
  calculation: string;
  tip: string;
}

export type MetricKey =
  | 'weeklyVolume'
  | 'strengthProgress'
  | 'maxWeight'
  | 'estimated1RM'
  | 'volume'
  | 'personalRecords'
  | 'strongestLifts'
  | 'thisWeek'
  | 'streak'
  | 'effortLevel'
  | 'pushPullBalance'
  | 'workoutFrequency'
  | 'trainingLoad'
  | 'loadLevel'
  | 'muscleGroups'
  | 'movementBalance'
  | 'recoveryStatus'
  | 'allTimeSummary';

export const METRIC_HELP: Record<MetricKey, MetricHelp> = {
  weeklyVolume: {
    title: 'Weekly Volume',
    description:
      'Total weight lifted each week. This is the primary driver of muscle growth - more volume (to a point) generally means more gains.',
    calculation: 'Sum of (weight × reps) for all working sets in the week',
    tip: 'Aim to gradually increase weekly volume over time. A 5-10% increase per week is sustainable for most lifters.',
  },
  strengthProgress: {
    title: 'Strength Progress',
    description:
      'Tracks how your strength changes over time for each exercise. You can view max weight, estimated 1RM, or volume per session.',
    calculation: 'Data points from each workout session plotted over time',
    tip: 'Look for an upward trend. Plateaus lasting 3+ weeks may indicate a need to adjust programming.',
  },
  maxWeight: {
    title: 'Max Weight',
    description:
      'The heaviest weight you successfully lifted for at least one rep during a workout session.',
    calculation: 'Maximum weight value from all working sets',
    tip: 'This is your raw strength indicator. New highs here mean you\'re getting stronger!',
  },
  estimated1RM: {
    title: 'Estimated 1RM',
    description:
      'Your theoretical maximum for a single rep, calculated from your working sets. This lets you track strength without testing actual max lifts.',
    calculation: 'Brzycki Formula: weight × (36 ÷ (37 - reps))\n\nExample: 80kg × 8 reps = 80 × 1.24 = 99kg e1RM',
    tip: 'e1RM from higher reps (5-10) is often more accurate than from very low (1-3) or high (12+) reps.',
  },
  volume: {
    title: 'Session Volume',
    description:
      'Total load lifted in a single workout session. Higher volume stimulates more muscle growth.',
    calculation: 'Sum of (weight × reps) for all working sets in the session',
    tip: 'Volume is key for hypertrophy. Track this to ensure progressive overload.',
  },
  personalRecords: {
    title: 'Personal Records',
    description:
      'Your best performances for each exercise. PRs are automatically detected when you exceed previous bests.',
    calculation: 'Highest max weight and estimated 1RM ever recorded for each exercise',
    tip: 'Celebrate your PRs! They represent real progress. Recent PRs (within 7 days) get a special badge.',
  },
  strongestLifts: {
    title: 'Strongest Lifts',
    description:
      'Your top exercises ranked by estimated 1RM. This shows where your strength is most developed.',
    calculation: 'Exercises sorted by highest estimated 1RM in descending order',
    tip: 'Use this to identify your strongest lifts and spot imbalances between similar movements.',
  },
  thisWeek: {
    title: 'This Week Overview',
    description:
      'Quick snapshot of your current week\'s training: streak, effort level, and push/pull balance.',
    calculation: 'Aggregated stats from workouts in the current calendar week',
    tip: 'Check this at the start of each workout to see how your week is shaping up.',
  },
  streak: {
    title: 'Training Streak',
    description:
      'Consecutive weeks where you\'ve completed at least one workout. Consistency is the key to long-term progress!',
    calculation: 'Count of consecutive weeks with ≥1 workout',
    tip: 'Even one workout per week keeps your streak alive. Consistency beats intensity over time.',
  },
  effortLevel: {
    title: 'Effort Level',
    description:
      'How hard you\'re training based on RPE (Rate of Perceived Exertion) data from your logged sets.',
    calculation: 'Categorized from average RPE:\n• Easy: RPE < 6\n• Moderate: RPE 6-7\n• Hard: RPE 7-8\n• Very Hard: RPE > 8',
    tip: 'Log RPE on your sets for accurate effort tracking. Most sets should be RPE 7-8 for optimal gains.',
  },
  pushPullBalance: {
    title: 'Push/Pull Balance',
    description:
      'Ratio between pushing exercises (bench, OHP) and pulling exercises (rows, pullups). Balance helps prevent injuries.',
    calculation: 'Push volume ÷ Pull volume\n\nIdeal ratio: 1:1',
    tip: 'Most people push more than they pull. If your ratio is >1.2:1, add more pulling exercises.',
  },
  workoutFrequency: {
    title: 'Workout Frequency',
    description:
      'Calendar view showing which days you trained. Darker circles = more workouts that day.',
    calculation: 'Count of workouts per day, displayed as a heat map',
    tip: 'Find a frequency you can sustain. 3-4 workouts per week is effective for most people.',
  },
  trainingLoad: {
    title: 'Training Load',
    description:
      'Comprehensive view of your training volume, intensity, and weekly trends. Works even without RPE data.',
    calculation:
      '• Sets: Count of working sets\n• Volume: Total weight × reps\n• Intensity: Average (weight ÷ exercise max) × 100%',
    tip: 'Use this to ensure you\'re progressively overloading. The weekly trend bars show your recent trajectory.',
  },
  loadLevel: {
    title: 'Load Level',
    description:
      'Compares this week\'s volume to your average. Helps identify if you need a deload or can push harder.',
    calculation:
      '• Light: < 80% of average\n• Moderate: 80-120% of average\n• Heavy: > 120% of average',
    tip: 'After several heavy weeks in a row, consider a light "deload" week to recover.',
  },
  muscleGroups: {
    title: 'Muscle Groups',
    description:
      'Distribution of training volume across different muscle groups. Helps ensure balanced development.',
    calculation: 'Volume per muscle group based on exercise primary muscle targets',
    tip: 'Look for roughly balanced distribution unless you\'re intentionally specializing.',
  },
  movementBalance: {
    title: 'Movement Balance',
    description:
      'Shows the ratio between opposing movement patterns: Push vs Pull, and Upper vs Lower body.',
    calculation:
      '• Push/Pull: Pressing vs rowing/pulling volume\n• Upper/Lower: Upper body vs leg volume\n\nIdeal: Close to 1:1 for both',
    tip: 'Imbalances here can lead to posture issues and injury risk over time.',
  },
  recoveryStatus: {
    title: 'Recovery Status',
    description:
      'Estimates how recovered each muscle group is based on when it was last trained and training volume.',
    calculation:
      'Recovery % based on:\n• Time since last workout\n• Volume of last session\n• Typical 48-72hr recovery window',
    tip: 'Green = ready to train hard. Yellow = train light. Red = consider resting that muscle.',
  },
  allTimeSummary: {
    title: 'All-Time Summary',
    description:
      'Your lifetime statistics: total exercises tracked and cumulative volume lifted.',
    calculation: 'Sum of all volume from all recorded workouts',
    tip: 'This number only goes up! It represents your total investment in getting stronger.',
  },
};

interface MetricHelpModalProps {
  visible: boolean;
  metricKey: MetricKey | null;
  onClose: () => void;
}

/**
 * MetricHelpModal - Displays detailed explanation of a metric
 *
 * Shows:
 * - What the metric measures
 * - How it's calculated
 * - Practical tip for the user
 *
 * @example
 * ```tsx
 * const [helpKey, setHelpKey] = useState<MetricKey | null>(null);
 *
 * <MetricHelpModal
 *   visible={helpKey !== null}
 *   metricKey={helpKey}
 *   onClose={() => setHelpKey(null)}
 * />
 * ```
 */
export function MetricHelpModal({ visible, metricKey, onClose }: MetricHelpModalProps) {
  if (!metricKey) return null;

  const help = METRIC_HELP[metricKey];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <BlurView
          intensity={20}
          tint="dark"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        <View
          style={{
            backgroundColor: '#1A1A1A',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: screenHeight * 0.7,
            paddingTop: 20,
            paddingHorizontal: 20,
            paddingBottom: 40,
          }}
        >
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
            <XStack alignItems="center" gap="$2">
              <Info size={20} color="#FFFFFF" weight="fill" />
              <Text fontSize="$5" fontWeight="700" color="#FFFFFF">
                {help.title}
              </Text>
            </XStack>
            <Pressable onPress={onClose} hitSlop={8}>
              <XStack
                padding="$2"
                borderRadius={20}
                backgroundColor="rgba(255,255,255,0.1)"
              >
                <X size={18} color="#FFFFFF" />
              </XStack>
            </Pressable>
          </XStack>

          <ScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
              {/* Description */}
              <YStack marginBottom="$4">
                <Text
                  fontSize={10}
                  fontWeight="600"
                  color="rgba(255,255,255,0.5)"
                  marginBottom="$2"
                  textTransform="uppercase"
                  letterSpacing={1}
                >
                  What it measures
                </Text>
                <Text fontSize="$3" color="rgba(255,255,255,0.9)" lineHeight={22}>
                  {help.description}
                </Text>
              </YStack>

              {/* Calculation */}
              <YStack
                marginBottom="$4"
                padding="$3"
                backgroundColor="rgba(255,255,255,0.05)"
                borderRadius={12}
              >
                <XStack alignItems="center" gap="$2" marginBottom="$2">
                  <Calculator size={14} color="rgba(255,255,255,0.5)" />
                  <Text
                    fontSize={10}
                    fontWeight="600"
                    color="rgba(255,255,255,0.5)"
                    textTransform="uppercase"
                    letterSpacing={1}
                  >
                    How it's calculated
                  </Text>
                </XStack>
                <Text
                  fontSize="$2"
                  color="rgba(255,255,255,0.7)"
                  fontFamily="$mono"
                  lineHeight={20}
                >
                  {help.calculation}
                </Text>
              </YStack>

              {/* Tip */}
              <YStack
                padding="$3"
                backgroundColor="rgba(81, 207, 102, 0.1)"
                borderRadius={12}
                borderLeftWidth={3}
                borderLeftColor="#51CF66"
              >
                <XStack alignItems="center" gap="$2" marginBottom="$2">
                  <Lightbulb size={14} color="#51CF66" weight="fill" />
                  <Text
                    fontSize={10}
                    fontWeight="600"
                    color="#51CF66"
                    textTransform="uppercase"
                    letterSpacing={1}
                  >
                    Pro Tip
                  </Text>
                </XStack>
                <Text fontSize="$3" color="rgba(255,255,255,0.9)" lineHeight={22}>
                  {help.tip}
                </Text>
              </YStack>
            </ScrollView>
          </View>
      </Pressable>
    </Modal>
  );
}
