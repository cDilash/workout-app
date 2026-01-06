import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

// Rest timer presets in seconds
export const TIMER_PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '60s', seconds: 60 },
  { label: '90s', seconds: 90 },
  { label: '2m', seconds: 120 },
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
];

interface TimerStore {
  // Timer state
  isRunning: boolean;
  remainingSeconds: number;
  totalSeconds: number;

  // Last used preset for quick restart
  lastPresetSeconds: number;

  // Actions
  startTimer: (seconds: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  cancelTimer: () => void;
  tick: () => void;
  addTime: (seconds: number) => void;

  // Internal
  _intervalId: ReturnType<typeof setInterval> | null;
  _cleanup: () => void;
}

// Play completion sound
async function playCompletionSound() {
  try {
    const { sound } = await Audio.Sound.createAsync(
      // Use a system-like beep (we'll use haptics as primary feedback)
      { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
      { shouldPlay: true, volume: 0.5 }
    );
    // Clean up after playing
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (error) {
    console.log('Could not play sound:', error);
  }
}

// Trigger completion feedback
async function triggerCompletionFeedback() {
  // Heavy haptic impact
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

  // Try to play sound (may fail silently)
  playCompletionSound();
}

// Trigger tick feedback at certain intervals
async function triggerTickFeedback(remaining: number) {
  // Haptic at 10, 5, 4, 3, 2, 1 seconds
  if (remaining <= 5 || remaining === 10) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  isRunning: false,
  remainingSeconds: 0,
  totalSeconds: 0,
  lastPresetSeconds: 90, // Default 90 seconds

  _intervalId: null,

  _cleanup: () => {
    const { _intervalId } = get();
    if (_intervalId) {
      clearInterval(_intervalId);
      set({ _intervalId: null });
    }
  },

  startTimer: (seconds: number) => {
    const { _cleanup } = get();
    _cleanup();

    // Light haptic to confirm start
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    set({
      isRunning: true,
      remainingSeconds: seconds,
      totalSeconds: seconds,
      lastPresetSeconds: seconds,
    });

    const intervalId = setInterval(() => {
      get().tick();
    }, 1000);

    set({ _intervalId: intervalId });
  },

  pauseTimer: () => {
    const { _cleanup } = get();
    _cleanup();
    set({ isRunning: false });
  },

  resumeTimer: () => {
    const { remainingSeconds } = get();
    if (remainingSeconds <= 0) return;

    set({ isRunning: true });

    const intervalId = setInterval(() => {
      get().tick();
    }, 1000);

    set({ _intervalId: intervalId });
  },

  cancelTimer: () => {
    const { _cleanup } = get();
    _cleanup();
    set({
      isRunning: false,
      remainingSeconds: 0,
      totalSeconds: 0,
    });
  },

  tick: () => {
    const { remainingSeconds, _cleanup } = get();

    if (remainingSeconds <= 1) {
      // Timer complete
      _cleanup();
      triggerCompletionFeedback();
      set({
        isRunning: false,
        remainingSeconds: 0,
      });
    } else {
      const newRemaining = remainingSeconds - 1;
      triggerTickFeedback(newRemaining);
      set({ remainingSeconds: newRemaining });
    }
  },

  addTime: (seconds: number) => {
    set((state) => ({
      remainingSeconds: state.remainingSeconds + seconds,
      totalSeconds: state.totalSeconds + seconds,
    }));
  },
}));
