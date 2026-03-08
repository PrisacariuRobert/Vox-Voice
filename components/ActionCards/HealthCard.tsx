import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Colors } from '../../constants/colors';

interface HealthCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

interface Metric {
  icon: string;
  label: string;
  value: string;
  color: string;
}

function parseMetrics(text: string): Metric[] {
  const metrics: Metric[] = [];
  const lines = text.split('\n').filter(l => l.trim().length > 3);
  for (const line of lines) {
    const clean = line.replace(/^[•\-*\s]+/, '').trim();
    if (/step/i.test(clean)) {
      const val = clean.match(/([\d,]+)\s*step/i)?.[1] ?? clean.match(/[\d,]+/)?.[0];
      if (val) metrics.push({ icon: '🚶', label: 'Steps', value: val, color: '#FF9500' });
    } else if (/heart|bpm/i.test(clean)) {
      const val = clean.match(/([\d]+)\s*bpm/i)?.[1] ?? clean.match(/[\d]+/)?.[0];
      if (val) metrics.push({ icon: '❤️', label: 'Heart Rate', value: `${val} bpm`, color: '#FF2D55' });
    } else if (/sleep/i.test(clean)) {
      const val = clean.match(/([\d.]+)\s*h/i)?.[1] ?? clean.match(/[\d.]+/)?.[0];
      if (val) metrics.push({ icon: '😴', label: 'Sleep', value: `${val}h`, color: '#5856D6' });
    } else if (/calorie|kcal/i.test(clean)) {
      const val = clean.match(/([\d,]+)\s*(?:cal|kcal)/i)?.[1] ?? clean.match(/[\d,]+/)?.[0];
      if (val) metrics.push({ icon: '🔥', label: 'Calories', value: `${val} kcal`, color: '#FF3B30' });
    } else if (/distance|km|mile/i.test(clean)) {
      const val = clean.match(/([\d.]+)\s*(?:km|mi)/i)?.[0] ?? clean.match(/[\d.]+/)?.[0];
      if (val) metrics.push({ icon: '📏', label: 'Distance', value: val, color: '#34C759' });
    } else if (/workout|exercise/i.test(clean)) {
      const val = clean.match(/([\d]+)\s*min/i)?.[0] ?? clean.match(/[\d]+/)?.[0];
      if (val) metrics.push({ icon: '💪', label: 'Workout', value: val, color: '#007AFF' });
    }
  }
  return metrics;
}

export function HealthCard({ content, metadata }: HealthCardProps) {
  const translateY = useSharedValue(200);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    opacity.value = withTiming(1, { duration: 300 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const metrics = parseMetrics(content);

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>❤️</Text>
        <Text style={styles.title}>Health</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
      </View>

      {metrics.length > 0 ? (
        <ScrollView scrollEnabled={false}>
          <View style={styles.grid}>
            {metrics.map((m, i) => (
              <View key={i} style={[styles.metricBox, { borderColor: `${m.color}30` }]}>
                <Text style={styles.metricIcon}>{m.icon}</Text>
                <Text style={styles.metricLabel}>{m.label}</Text>
                <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <Text style={styles.content}>{content.slice(0, 300)}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { width: 300, backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,45,85,0.2)', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  emoji: { fontSize: 18 },
  title: { fontFamily: 'Syne_600SemiBold', fontSize: 13, color: '#FF2D55', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  date: { fontFamily: 'Syne_400Regular', fontSize: 11, color: Colors.textTertiary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricBox: {
    width: '47%' as unknown as number, backgroundColor: Colors.bgSecondary, borderRadius: 14,
    padding: 14, borderWidth: 1, alignItems: 'center',
  },
  metricIcon: { fontSize: 24, marginBottom: 4 },
  metricLabel: { fontFamily: 'Syne_400Regular', fontSize: 11, color: Colors.textSecondary },
  metricValue: { fontFamily: 'Syne_700Bold', fontSize: 20, marginTop: 2 },
  content: { fontFamily: 'Syne_400Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
});
