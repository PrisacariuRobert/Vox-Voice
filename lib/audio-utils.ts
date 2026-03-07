import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

// Play a local sound asset (mp3/wav)
export async function playSound(uri: string): Promise<void> {
  try {
    const player = createAudioPlayer({ uri });
    player.play();
    player.addListener('playbackStatusUpdate', (status) => {
      if (!status.playing && status.currentTime > 0) {
        player.remove();
      }
    });
  } catch {
    // Non-critical — ignore if sound file missing
  }
}

// Haptic feedback wrappers
export const haptics = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};
