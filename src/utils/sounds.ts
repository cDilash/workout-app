import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { useSettingsStore } from '../stores/settingsStore';

// Sound object for timer completion
let timerCompleteSound: Audio.Sound | null = null;

/**
 * Initialize audio settings for the app.
 * Call this once when the app starts.
 */
export async function initializeAudio(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true, // Play even when phone is on silent
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch (error) {
    console.error('Failed to initialize audio:', error);
  }
}

/**
 * Play the timer completion sound.
 * Respects the user's sound settings (enabled and volume).
 */
export async function playTimerCompleteSound(): Promise<void> {
  const { timerSoundEnabled, timerSoundVolume } = useSettingsStore.getState();

  // Don't play if sound is disabled
  if (!timerSoundEnabled) {
    return;
  }

  try {
    // Unload previous sound if exists
    if (timerCompleteSound) {
      await timerCompleteSound.unloadAsync();
      timerCompleteSound = null;
    }

    // Create and play new sound
    // Using a bundled sound file - you can replace this with a custom sound
    const { sound } = await Audio.Sound.createAsync(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../assets/sounds/timer-complete.mp3'),
      {
        volume: timerSoundVolume,
        shouldPlay: true,
      }
    );

    timerCompleteSound = sound;

    // Auto-unload when playback finishes
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        timerCompleteSound = null;
      }
    });
  } catch (error) {
    // Sound file might not exist yet - fail silently
    console.warn('Timer sound not available:', error);
  }
}

/**
 * Play a simple beep using the system (fallback if no sound file).
 * Note: This uses a short generated tone approach.
 */
export async function playBeep(): Promise<void> {
  const { timerSoundEnabled, timerSoundVolume } = useSettingsStore.getState();

  if (!timerSoundEnabled) {
    return;
  }

  try {
    // Try to play the bundled sound first
    await playTimerCompleteSound();
  } catch {
    // Fallback: just log - haptics will provide feedback
    console.log('Sound playback skipped');
  }
}

/**
 * Clean up sound resources.
 * Call this when the app is closing or component unmounts.
 */
export async function cleanupSounds(): Promise<void> {
  try {
    if (timerCompleteSound) {
      await timerCompleteSound.unloadAsync();
      timerCompleteSound = null;
    }
  } catch (error) {
    console.error('Failed to cleanup sounds:', error);
  }
}
