import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { NewspaperIcon } from '../Icons';

interface NewsCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

function parseHeadlines(text: string): string[] {
  const lines = text.split('\n')
    .map(l => l.replace(/^[•\-*\d.)\s]+/, '').trim())
    .filter(l => l.length > 10 && l.length < 200);
  return lines.slice(0, 5);
}

export function NewsCard({ content, metadata }: NewsCardProps) {
  const translateY = useSharedValue(200);
  const opacity    = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    opacity.value    = withTiming(1, { duration: 300 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const headlines = parseHeadlines(content);
  const now = new Date();
  const timeStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.header}>
        <NewspaperIcon size={20} color={Colors.text} />
        <Text style={styles.title}>Top News</Text>
        <Text style={styles.date}>{timeStr}</Text>
      </View>

      <ScrollView scrollEnabled={false} style={styles.list}>
        {headlines.length > 0 ? (
          headlines.map((h, i) => (
            <View key={i} style={[styles.item, i < headlines.length - 1 && styles.itemBorder]}>
              <Text style={styles.num}>{i + 1}</Text>
              <Text style={styles.headline} numberOfLines={3}>{h}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.content}>{content.slice(0, 300)}</Text>
        )}
      </ScrollView>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 13,
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  date: {
    fontFamily: 'Syne_400Regular',
    fontSize: 11,
    color: Colors.textTertiary,
  },
  list: { maxHeight: 280 },
  item: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 9,
    alignItems: 'flex-start',
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  num: {
    fontFamily: 'Syne_700Bold',
    fontSize: 13,
    color: Colors.accent,
    width: 18,
    marginTop: 1,
  },
  headline: {
    fontFamily: 'Syne_400Regular',
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
    flex: 1,
  },
  content: {
    fontFamily: 'Syne_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
});
