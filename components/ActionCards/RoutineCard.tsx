import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Colors } from '../../constants/colors';

interface RoutineCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

function parseSteps(text: string): { label: string; done: boolean }[] {
  const steps: { label: string; done: boolean }[] = [];
  const lines = text.split('\n').filter(l => l.trim().length > 3);
  for (const line of lines) {
    const clean = line.replace(/^[•\-*\d.)\s✅☑️✓✔️❌⬜️□]+/, '').trim();
    if (clean.length < 3) continue;
    const done = /^[✅☑️✓✔️]/.test(line.trim()) || /done|complete|success/i.test(line);
    steps.push({ label: clean, done });
  }
  return steps;
}

export function RoutineCard({ content, metadata }: RoutineCardProps) {
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

  const name = (metadata?.name as string) ?? 'Routine';
  const steps = parseSteps(content);
  const completed = steps.filter(s => s.done).length;
  const total = steps.length || 1;
  const pct = Math.round((completed / total) * 100);
  const allDone = completed === total && total > 0;

  const emoji = /morning/i.test(name) ? '🌅'
    : /night|bed/i.test(name) ? '🌙'
    : /leav|away/i.test(name) ? '🚪'
    : /arriv|home/i.test(name) ? '🏠'
    : '⚡';

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.progress}>{completed}/{total} steps {allDone ? '— Done!' : ''}</Text>
        </View>
        <View style={styles.pctCircle}>
          <Text style={styles.pctText}>{pct}%</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>

      <ScrollView style={styles.list} scrollEnabled={false}>
        {steps.length > 0 ? steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <Text style={styles.check}>{step.done ? '✅' : '⬜'}</Text>
            <Text style={[styles.stepLabel, step.done && styles.stepDone]}>{step.label}</Text>
          </View>
        )) : (
          <Text style={styles.content}>{content.slice(0, 300)}</Text>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const TEAL = '#30B0C7';

const styles = StyleSheet.create({
  card: { width: 300, backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: `${TEAL}30`, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  emoji: { fontSize: 24 },
  name: { fontFamily: 'Syne_700Bold', fontSize: 16, color: Colors.text },
  progress: { fontFamily: 'Syne_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  pctCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${TEAL}15`, alignItems: 'center', justifyContent: 'center' },
  pctText: { fontFamily: 'Syne_700Bold', fontSize: 13, color: TEAL },
  progressBar: { height: 4, backgroundColor: Colors.bgSecondary, borderRadius: 2, marginBottom: 14, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: TEAL, borderRadius: 2 },
  list: { maxHeight: 250 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  check: { fontSize: 16 },
  stepLabel: { fontFamily: 'Syne_400Regular', fontSize: 13, color: Colors.text, flex: 1 },
  stepDone: { color: Colors.textSecondary, textDecorationLine: 'line-through' },
  content: { fontFamily: 'Syne_400Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
});
