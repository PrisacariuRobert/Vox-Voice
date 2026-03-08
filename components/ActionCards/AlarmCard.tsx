import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withRepeat, withSequence,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { AlarmClockIcon, CheckIcon } from '../Icons';

interface AlarmCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

function extractAlarmTime(text: string, meta?: Record<string, unknown>): string {
  if (meta?.time) return meta.time as string;
  const m = text.match(/\b(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)\b/i)
         || text.match(/alarm.*?(?:at|for)\s+(.{3,15})/i);
  return m?.[1] ?? m?.[0] ?? 'Alarm set';
}

export function AlarmCard({ content, metadata }: AlarmCardProps) {
  const translateY = useSharedValue(200);
  const opacity    = useSharedValue(0);
  const bellRot    = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    opacity.value    = withTiming(1, { duration: 300 });
    // Bell shake animation
    bellRot.value = withRepeat(
      withSequence(withSpring(15, { damping: 3 }), withSpring(-15, { damping: 3 }), withSpring(0)),
      3,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bellRot.value}deg` }],
  }));

  const time = extractAlarmTime(content, metadata);

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <Animated.View style={[styles.bell, bellStyle]}>
        <AlarmClockIcon size={40} />
      </Animated.View>
      <View style={styles.info}>
        <Text style={styles.label}>Alarm Set</Text>
        <Text style={styles.time}>{time}</Text>
        <Text style={styles.sub}>I'll remind you on time</Text>
      </View>
      <View style={styles.checkBadge}>
        <CheckIcon size={16} color="#fff" />
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
    borderColor: 'rgba(245,166,35,0.35)',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bell: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  label: {
    fontFamily: 'Syne_500Medium',
    fontSize: 11,
    color: Colors.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  time: {
    fontFamily: 'Syne_700Bold',
    fontSize: 26,
    color: Colors.text,
    marginBottom: 2,
  },
  sub: {
    fontFamily: 'Syne_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
  },
  checkBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
