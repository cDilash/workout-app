import React from 'react';
import { StyleSheet, Pressable, View as RNView } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useTimerStore, TIMER_PRESETS } from '@/src/stores/timerStore';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface RestTimerProps {
  onTimerComplete?: () => void;
}

export function RestTimer({ onTimerComplete }: RestTimerProps) {
  const {
    isRunning,
    remainingSeconds,
    totalSeconds,
    lastPresetSeconds,
    startTimer,
    pauseTimer,
    resumeTimer,
    cancelTimer,
    addTime,
  } = useTimerStore();

  const isActive = isRunning || remainingSeconds > 0;
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;

  // Quick restart with last preset
  const handleQuickRestart = () => {
    startTimer(lastPresetSeconds);
  };

  if (!isActive) {
    // Show preset buttons when no timer is running
    return (
      <View style={styles.presetsContainer}>
        <Text style={styles.presetsLabel}>Rest Timer</Text>
        <View style={styles.presetsRow}>
          {TIMER_PRESETS.map((preset) => (
            <Pressable
              key={preset.seconds}
              style={styles.presetButton}
              onPress={() => startTimer(preset.seconds)}>
              <Text style={styles.presetButtonText}>{preset.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  // Active timer display
  return (
    <View style={styles.timerContainer}>
      {/* Progress ring background */}
      <View style={styles.progressContainer}>
        <RNView
          style={[
            styles.progressRing,
            {
              borderColor: remainingSeconds <= 5 ? '#FF3B30' : '#007AFF',
            },
          ]}>
          <Text
            style={[
              styles.timerText,
              remainingSeconds <= 5 && styles.timerTextWarning,
            ]}>
            {formatTime(remainingSeconds)}
          </Text>
          <Text style={styles.timerLabel}>
            {remainingSeconds <= 5 ? 'Get Ready!' : 'Rest'}
          </Text>
        </RNView>
      </View>

      {/* Timer controls */}
      <View style={styles.controlsRow}>
        <Pressable style={styles.controlButton} onPress={() => addTime(-15)}>
          <Text style={styles.controlButtonText}>-15s</Text>
        </Pressable>

        <Pressable
          style={[styles.controlButton, styles.pauseButton]}
          onPress={isRunning ? pauseTimer : resumeTimer}>
          <Text style={styles.pauseButtonText}>
            {isRunning ? '⏸' : '▶'}
          </Text>
        </Pressable>

        <Pressable style={styles.controlButton} onPress={() => addTime(15)}>
          <Text style={styles.controlButtonText}>+15s</Text>
        </Pressable>

        <Pressable
          style={[styles.controlButton, styles.cancelButton]}
          onPress={cancelTimer}>
          <Text style={styles.cancelButtonText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Compact version for showing in header
export function RestTimerCompact() {
  const { isRunning, remainingSeconds, cancelTimer } = useTimerStore();

  if (!isRunning && remainingSeconds === 0) return null;

  return (
    <Pressable style={styles.compactContainer} onPress={cancelTimer}>
      <Text
        style={[
          styles.compactText,
          remainingSeconds <= 5 && styles.compactTextWarning,
        ]}>
        {formatTime(remainingSeconds)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Presets (inactive state)
  presetsContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  presetsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'transparent',
  },
  presetButton: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },

  // Active timer
  timerContainer: {
    backgroundColor: '#f0f7ff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  progressContainer: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  progressRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 36,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: '#007AFF',
  },
  timerTextWarning: {
    color: '#FF3B30',
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  // Controls
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  controlButton: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  pauseButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    paddingHorizontal: 20,
  },
  pauseButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },

  // Compact version
  compactContainer: {
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  compactText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  compactTextWarning: {
    backgroundColor: '#FF3B30',
  },
});
