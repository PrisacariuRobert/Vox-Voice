import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';

interface SystemControlCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

function detectAction(content: string): { icon: string; label: string; detail: string } {
  const lower = content.toLowerCase();

  if (/dark mode|light mode|appearance/.test(lower)) {
    const isDark = /dark mode on|enabled dark|switched.*dark/.test(lower);
    return { icon: isDark ? '🌙' : '☀️', label: isDark ? 'Dark Mode On' : 'Light Mode On', detail: content.slice(0, 80) };
  }
  if (/volume|muted|unmuted/.test(lower)) {
    const vol = content.match(/\d+%|\d+ volume/)?.[0];
    return { icon: '🔊', label: 'Volume', detail: vol ?? content.slice(0, 80) };
  }
  if (/do not disturb|focus|dnd/.test(lower)) {
    return { icon: '🎯', label: 'Focus Mode', detail: content.slice(0, 80) };
  }
  if (/brightness/.test(lower)) {
    return { icon: '💡', label: 'Brightness', detail: content.slice(0, 80) };
  }
  if (/screenshot/.test(lower)) {
    return { icon: '📸', label: 'Screenshot', detail: content.slice(0, 80) };
  }
  if (/battery/.test(lower)) {
    return { icon: '🔋', label: 'Battery', detail: content.slice(0, 80) };
  }
  if (/wi-fi|wifi|network/.test(lower)) {
    return { icon: '📶', label: 'Network', detail: content.slice(0, 80) };
  }
  if (/lock/.test(lower)) {
    return { icon: '🔒', label: 'Screen Lock', detail: content.slice(0, 80) };
  }
  return { icon: '⚙️', label: 'System', detail: content.slice(0, 80) };
}

export function SystemControlCard({ content, metadata }: SystemControlCardProps) {
  const translateY = useSharedValue(200);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSequence(withSpring(1.05, { damping: 8 }), withSpring(1, { damping: 12 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const { icon, label, detail } = detectAction(content);

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.detail} numberOfLines={2}>{detail}</Text>
      </View>
      <View style={styles.checkBadge}>
        <Text style={styles.check}>✓</Text>
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
    borderColor: Colors.surfaceBorder,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 26 },
  info: { flex: 1 },
  label: {
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 2,
  },
  detail: {
    fontFamily: 'Syne_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    fontFamily: 'Syne_700Bold',
    fontSize: 14,
    color: '#fff',
  },
});
