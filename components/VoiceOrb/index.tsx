import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Circle, Path } from 'react-native-svg';
import { OrbState } from '../../types';

const ORB_SIZE = 180;

// Blob colors — same as AIAvatar
const CYAN   = '#90e0ff';
const PINK   = '#ff9ced';
const PURPLE = '#c49cff';

// Blob SVG sizes (larger than CSS to encompass the gradient fade = blur simulation)
const BLOB_L = ORB_SIZE * 0.80; // cyan & pink
const BLOB_S = ORB_SIZE * 0.75; // purple

// Listening-like states = fast pulse + ripple
const LISTENING_STATES: OrbState[] = ['recording', 'wake_listening'];

interface VoiceOrbProps {
  orbState: OrbState;
  audioLevel?: number;
}

export function VoiceOrb({ orbState, audioLevel = 0 }: VoiceOrbProps) {
  const isListening = LISTENING_STATES.includes(orbState);

  // Blob pulse scales
  const blob1Scale = useSharedValue(1);
  const blob2Scale = useSharedValue(1);
  const blob3Scale = useSharedValue(1);

  // Outer orb scale (subtle breathe)
  const orbScale = useSharedValue(1);

  // Ripple rings (for listening/recording)
  const ripple1Scale = useSharedValue(1);
  const ripple1Opacity = useSharedValue(0);
  const ripple2Scale = useSharedValue(1);
  const ripple2Opacity = useSharedValue(0);

  // Vignette fades out when listening so colors pop
  const vignetteOpacity = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(blob1Scale);
    cancelAnimation(blob2Scale);
    cancelAnimation(blob3Scale);
    cancelAnimation(orbScale);
    cancelAnimation(ripple1Scale);
    cancelAnimation(ripple1Opacity);
    cancelAnimation(ripple2Scale);
    cancelAnimation(ripple2Opacity);

    if (isListening) {
      // Fast pulse — matches animate-[pulse_1s], _1.2s, _0.8s
      blob1Scale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.92, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ), -1
      );
      blob2Scale.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ), -1
      );
      blob3Scale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.94, { duration: 400, easing: Easing.inOut(Easing.ease) })
        ), -1
      );
      orbScale.value = withSpring(1.05, { damping: 14, stiffness: 120 });
      vignetteOpacity.value = withTiming(0.4, { duration: 300 });

      // Ripple ring 1 — ping 1.5s
      ripple1Scale.value = withRepeat(
        withTiming(1.5, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, false
      );
      ripple1Opacity.value = withRepeat(
        withSequence(
          withTiming(0.22, { duration: 100 }),
          withTiming(0, { duration: 1400, easing: Easing.out(Easing.ease) })
        ), -1
      );
      // Ripple ring 2 — ping 2s, offset
      ripple2Scale.value = withRepeat(
        withTiming(1.55, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false
      );
      ripple2Opacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 400 }),
          withTiming(0.18, { duration: 100 }),
          withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) })
        ), -1
      );
    } else {
      vignetteOpacity.value = withTiming(1, { duration: 400 });
      orbScale.value = withSpring(1, { damping: 14, stiffness: 120 });
      ripple1Opacity.value = withTiming(0, { duration: 200 });
      ripple2Opacity.value = withTiming(0, { duration: 200 });

      switch (orbState) {
        case 'idle':
          // Slow lazy pulse — matches pulse_4s, _5s, _6s
          blob1Scale.value = withRepeat(
            withSequence(
              withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
              withTiming(0.94, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ), -1
          );
          blob2Scale.value = withRepeat(
            withSequence(
              withTiming(0.93, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
              withTiming(1.07, { duration: 2500, easing: Easing.inOut(Easing.ease) })
            ), -1
          );
          blob3Scale.value = withRepeat(
            withSequence(
              withTiming(1.05, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
              withTiming(0.95, { duration: 3000, easing: Easing.inOut(Easing.ease) })
            ), -1
          );
          break;

        case 'thinking':
          blob1Scale.value = withRepeat(
            withSequence(
              withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
              withTiming(0.92, { duration: 1000, easing: Easing.inOut(Easing.ease) })
            ), -1
          );
          blob2Scale.value = withRepeat(
            withSequence(
              withTiming(0.9, { duration: 800, easing: Easing.inOut(Easing.ease) }),
              withTiming(1.08, { duration: 800, easing: Easing.inOut(Easing.ease) })
            ), -1
          );
          blob3Scale.value = withRepeat(
            withSequence(
              withTiming(1.06, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
              withTiming(0.96, { duration: 1200, easing: Easing.inOut(Easing.ease) })
            ), -1
          );
          break;

        case 'speaking':
          blob1Scale.value = withRepeat(
            withSequence(
              withTiming(1.1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
              withTiming(0.93, { duration: 600, easing: Easing.inOut(Easing.ease) })
            ), -1
          );
          blob2Scale.value = withRepeat(
            withSequence(
              withTiming(0.92, { duration: 500, easing: Easing.inOut(Easing.ease) }),
              withTiming(1.08, { duration: 500, easing: Easing.inOut(Easing.ease) })
            ), -1
          );
          blob3Scale.value = withRepeat(
            withSequence(
              withTiming(1.07, { duration: 700, easing: Easing.inOut(Easing.ease) }),
              withTiming(0.95, { duration: 700, easing: Easing.inOut(Easing.ease) })
            ), -1
          );
          break;

        case 'done':
          blob1Scale.value = withSpring(1, { damping: 12, stiffness: 180 });
          blob2Scale.value = withSpring(1, { damping: 12, stiffness: 180 });
          blob3Scale.value = withSpring(1, { damping: 12, stiffness: 180 });
          orbScale.value = withSequence(
            withTiming(1.12, { duration: 150, easing: Easing.out(Easing.ease) }),
            withSpring(1, { damping: 10, stiffness: 200 })
          );
          break;
      }
    }
  }, [orbState]);

  // Audio reactivity during recording
  const liveOrbScale = useSharedValue(1);
  useEffect(() => {
    if (orbState === 'recording') {
      liveOrbScale.value = withSpring(1 + audioLevel * 0.2, { damping: 15, stiffness: 200 });
    }
  }, [audioLevel, orbState]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value * (orbState === 'recording' ? liveOrbScale.value : 1) }],
  }));
  const blob1Style = useAnimatedStyle(() => ({
    transform: [{ scale: blob1Scale.value }],
  }));
  const blob2Style = useAnimatedStyle(() => ({
    transform: [{ scale: blob2Scale.value }],
  }));
  const blob3Style = useAnimatedStyle(() => ({
    transform: [{ scale: blob3Scale.value }],
  }));
  const ripple1Style = useAnimatedStyle(() => ({
    opacity: ripple1Opacity.value,
    transform: [{ scale: ripple1Scale.value }],
  }));
  const ripple2Style = useAnimatedStyle(() => ({
    opacity: ripple2Opacity.value,
    transform: [{ scale: ripple2Scale.value }],
  }));
  const vignetteStyle = useAnimatedStyle(() => ({
    opacity: vignetteOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Ripple rings — visible during listening/recording */}
      <Animated.View style={[styles.ripple, { backgroundColor: CYAN }, ripple1Style]} />
      <Animated.View style={[styles.ripple, { backgroundColor: PINK }, ripple2Style]} />

      {/* Main orb */}
      <Animated.View style={[styles.orb, orbStyle]}>

        {/* Frosted glass shell */}
        <View style={styles.glass}>

          {/* Blobs + vignette, clipped to circle */}
          <View style={styles.blobClip}>

            {/* Cyan blob — top-left (SVG radial gradient = simulated blur) */}
            <Animated.View style={[styles.blobCyanWrap, blob1Style]}>
              <Svg width={BLOB_L} height={BLOB_L}>
                <Defs>
                  <RadialGradient id="orbBlobCyan" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor={CYAN} stopOpacity={0.9} />
                    <Stop offset="40%" stopColor={CYAN} stopOpacity={0.85} />
                    <Stop offset="70%" stopColor={CYAN} stopOpacity={0.35} />
                    <Stop offset="100%" stopColor={CYAN} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle cx={BLOB_L / 2} cy={BLOB_L / 2} r={BLOB_L / 2} fill="url(#orbBlobCyan)" />
              </Svg>
            </Animated.View>

            {/* Pink blob — top-right */}
            <Animated.View style={[styles.blobPinkWrap, blob2Style]}>
              <Svg width={BLOB_L} height={BLOB_L}>
                <Defs>
                  <RadialGradient id="orbBlobPink" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor={PINK} stopOpacity={0.8} />
                    <Stop offset="40%" stopColor={PINK} stopOpacity={0.7} />
                    <Stop offset="70%" stopColor={PINK} stopOpacity={0.3} />
                    <Stop offset="100%" stopColor={PINK} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle cx={BLOB_L / 2} cy={BLOB_L / 2} r={BLOB_L / 2} fill="url(#orbBlobPink)" />
              </Svg>
            </Animated.View>

            {/* Purple blob — bottom-right */}
            <Animated.View style={[styles.blobPurpleWrap, blob3Style]}>
              <Svg width={BLOB_S} height={BLOB_S}>
                <Defs>
                  <RadialGradient id="orbBlobPurple" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor={PURPLE} stopOpacity={0.7} />
                    <Stop offset="40%" stopColor={PURPLE} stopOpacity={0.6} />
                    <Stop offset="70%" stopColor={PURPLE} stopOpacity={0.25} />
                    <Stop offset="100%" stopColor={PURPLE} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle cx={BLOB_S / 2} cy={BLOB_S / 2} r={BLOB_S / 2} fill="url(#orbBlobPurple)" />
              </Svg>
            </Animated.View>

            {/* White vignette — matches CSS radial-gradient(transparent 25%, white 85%) */}
            <Animated.View style={[styles.vignetteWrap, vignetteStyle]} pointerEvents="none">
              <Svg width={ORB_SIZE} height={ORB_SIZE}>
                <Defs>
                  <RadialGradient id="orbVignette" cx="50%" cy="50%" r="50%">
                    <Stop offset="25%" stopColor="white" stopOpacity={0} />
                    <Stop offset="55%" stopColor="white" stopOpacity={0.6} />
                    <Stop offset="85%" stopColor="white" stopOpacity={1} />
                  </RadialGradient>
                </Defs>
                <Circle cx={ORB_SIZE / 2} cy={ORB_SIZE / 2} r={ORB_SIZE / 2} fill="url(#orbVignette)" />
              </Svg>
            </Animated.View>

          </View>
        </View>

        {/* Sparkle star — centered, on top */}
        <View style={styles.sparkleWrapper} pointerEvents="none">
          <Svg
            viewBox="0 0 100 100"
            width={ORB_SIZE * 0.42}
            height={ORB_SIZE * 0.42}
          >
            <Path
              d="M50 10 C50 38, 62 50, 90 50 C62 50, 50 62, 50 90 C50 62, 38 50, 10 50 C38 50, 50 38, 50 10 Z"
              fill="#FFFFFF"
              fillOpacity={0.95}
            />
          </Svg>
        </View>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: ORB_SIZE + 80,
    height: ORB_SIZE + 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Soft outer shadow
    shadowColor: '#b4c8f0',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 10,
  },
  glass: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    overflow: 'hidden',
  },
  blobClip: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
  },
  // Blob wrapper positions — centered on the AIAvatar CSS center points
  // Cyan: CSS top=15% left=0% size=65% → center (32.5%, 47.5%)
  blobCyanWrap: {
    position: 'absolute',
    width: BLOB_L,
    height: BLOB_L,
    top: ORB_SIZE * 0.475 - BLOB_L / 2,
    left: ORB_SIZE * 0.325 - BLOB_L / 2,
  },
  // Pink: CSS top=5% right=0% size=65% → center (67.5%, 37.5%)
  blobPinkWrap: {
    position: 'absolute',
    width: BLOB_L,
    height: BLOB_L,
    top: ORB_SIZE * 0.375 - BLOB_L / 2,
    left: ORB_SIZE * 0.675 - BLOB_L / 2,
  },
  // Purple: CSS bottom=5% right=15% size=60% → center (55%, 65%)
  blobPurpleWrap: {
    position: 'absolute',
    width: BLOB_S,
    height: BLOB_S,
    top: ORB_SIZE * 0.65 - BLOB_S / 2,
    left: ORB_SIZE * 0.55 - BLOB_S / 2,
  },
  vignetteWrap: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
  },
  sparkleWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
