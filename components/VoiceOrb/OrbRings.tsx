import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { OrbState } from '../../types';

interface OrbRingsProps {
  orbState: OrbState;
  audioLevel: number;
  size: number;
}

interface RingProps {
  index: number;
  orbState: OrbState;
  audioLevel: number;
  size: number;
  color: string;
}

function Ring({ index, orbState, audioLevel, size, color }: RingProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = index * 150;
    const isActive = orbState === 'recording' || orbState === 'wake_listening';

    if (isActive) {
      const pulse = 1 + audioLevel * 0.5 + index * 0.1;
      scale.value = withDelay(delay, withRepeat(
        withSequence(
          withTiming(pulse, { duration: 600, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.in(Easing.ease) })
        ),
        -1
      ));
      opacity.value = withDelay(delay, withTiming(0.15 - index * 0.04, { duration: 400 }));
    } else if (orbState === 'thinking') {
      scale.value = withDelay(delay, withRepeat(
        withSequence(
          withTiming(1.2 + index * 0.08, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1
      ));
      opacity.value = withDelay(delay, withTiming(0.1 - index * 0.02, { duration: 400 }));
    } else if (orbState === 'speaking') {
      scale.value = withDelay(delay, withRepeat(
        withSequence(
          withTiming(1.1 + index * 0.06, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1
      ));
      opacity.value = withDelay(delay, withTiming(0.12 - index * 0.03, { duration: 400 }));
    } else {
      scale.value = withTiming(1, { duration: 500 });
      opacity.value = withTiming(0, { duration: 500 });
    }
  }, [orbState, audioLevel, index]);

  const ringSize = size + 40 + index * 28;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderColor: color,
        },
        animStyle,
      ]}
    />
  );
}

export function OrbRings({ orbState, audioLevel, size }: OrbRingsProps) {
  const ringColors = ['#4f8ef7', '#7c6af4', '#3dd68c'];

  return (
    <>
      {[0, 1, 2].map((i) => (
        <Ring
          key={i}
          index={i}
          orbState={orbState}
          audioLevel={audioLevel}
          size={size}
          color={ringColors[i % ringColors.length]}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 1,
    alignSelf: 'center',
  },
});
