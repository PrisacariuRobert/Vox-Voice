import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Colors } from '../../constants/colors';

interface SportsCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

function parseLines(text: string): string[] {
  return text.split('\n').map(l => l.replace(/^[•\-*\d.)\s]+/, '').trim()).filter(l => l.length > 3);
}

export function SportsCard({ content, metadata }: SportsCardProps) {
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

  const sportsType = (metadata?.type as string) ?? 'score';
  const isF1 = sportsType === 'f1' || /f1|formula/i.test(content);
  const lines = parseLines(content);
  const title = isF1 ? 'Formula 1' : (metadata?.league as string) ?? 'Sports';
  const emoji = isF1 ? '🏎️' : '⚽';

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.badge}>{sportsType.toUpperCase()}</Text>
      </View>

      <ScrollView style={styles.list} scrollEnabled={false}>
        {lines.length > 0 ? lines.slice(0, 10).map((line, i) => (
          <View key={i} style={[styles.row, i < Math.min(lines.length, 10) - 1 && styles.rowBorder]}>
            <Text style={styles.rank}>{i + 1}</Text>
            <Text style={styles.line} numberOfLines={2}>{line}</Text>
          </View>
        )) : (
          <Text style={styles.content}>{content.slice(0, 400)}</Text>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const F1_RED = '#E10600';

const styles = StyleSheet.create({
  card: {
    width: 300, backgroundColor: Colors.surface, borderRadius: 20,
    borderWidth: 1, borderColor: `${F1_RED}30`, padding: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  emoji: { fontSize: 20 },
  title: { fontFamily: 'Syne_600SemiBold', fontSize: 13, color: F1_RED, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  badge: {
    fontFamily: 'Syne_600SemiBold', fontSize: 10, color: Colors.textSecondary,
    backgroundColor: Colors.bgSecondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  list: { maxHeight: 300 },
  row: { flexDirection: 'row', gap: 10, paddingVertical: 8, alignItems: 'flex-start' },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  rank: { fontFamily: 'Syne_700Bold', fontSize: 13, color: F1_RED, width: 22, marginTop: 1 },
  line: { fontFamily: 'Syne_400Regular', fontSize: 13, color: Colors.text, lineHeight: 18, flex: 1 },
  content: { fontFamily: 'Syne_400Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
});
