import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ConnectionStatus } from '../types';
import { Colors } from '../constants/colors';

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  connected: Colors.success,
  connecting: Colors.warning,
  disconnected: Colors.textTertiary,
  error: Colors.pink,
};

interface StatusDotProps {
  status: ConnectionStatus;
}

export function StatusDot({ status }: StatusDotProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (status === 'connecting') {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 600 }),
          withTiming(1.0, { duration: 600 })
        ),
        -1
      );
    } else {
      opacity.value = withTiming(1, { duration: 300 });
    }
  }, [status]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    backgroundColor: STATUS_COLORS[status],
  }));

  return <Animated.View style={[styles.dot, dotStyle]} />;
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
