import { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { extractTimerDuration } from '../../lib/card-parser';

interface TimerCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TimerCard({ content, metadata }: TimerCardProps) {
  const translateY = useSharedValue(200);
  const opacity = useSharedValue(0);

  const initialDuration = (metadata?.duration_seconds as number) ?? extractTimerDuration(content) ?? 60;
  const [remaining, setRemaining] = useState(initialDuration);
  const [running, setRunning] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    opacity.value = withTiming(1, { duration: 300 });
  }, []);

  useEffect(() => {
    if (running && remaining > 0) {
      timerRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            setRunning(false);
            clearInterval(timerRef.current!);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const progress = remaining / initialDuration;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.header}>
        <Text style={styles.icon}>⏱</Text>
        <Text style={styles.title}>{remaining === 0 ? 'Timer Done!' : 'Timer Running'}</Text>
      </View>

      <View style={styles.timerCenter}>
        {/* SVG-like progress ring using View borders */}
        <View style={styles.ringOuter}>
          <View style={[styles.ringFill, { opacity: progress }]} />
          <Text style={styles.timeText}>{formatTime(remaining)}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => setRunning((r) => !r)}
        >
          <Text style={styles.btnText}>{running ? 'Pause' : 'Resume'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.cancelBtn]}
          onPress={() => {
            setRunning(false);
            setRemaining(0);
          }}
        >
          <Text style={[styles.btnText, styles.cancelBtnText]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.3)',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: { fontSize: 20, marginRight: 8 },
  title: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 13,
    color: Colors.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerCenter: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ringOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: Colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringFill: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(245, 166, 35, 0.15)',
  },
  timeText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 22,
    color: Colors.text,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    backgroundColor: Colors.surfaceHover,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  btnText: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  cancelBtn: {
    borderColor: 'rgba(240, 94, 135, 0.3)',
  },
  cancelBtnText: {
    color: Colors.pink,
  },
});
