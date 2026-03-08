import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Colors } from '../../constants/colors';

interface DocumentCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

export function DocumentCard({ content, metadata }: DocumentCardProps) {
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

  const action = (metadata?.action as string) ?? 'summary';
  const docName = (metadata?.name as string) ?? '';
  const query = (metadata?.query as string) ?? '';
  const isSummary = action === 'summary';

  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 3);

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{isSummary ? '📄' : '🔍'}</Text>
        <Text style={styles.title}>{isSummary ? 'Document Summary' : 'Document Search'}</Text>
      </View>

      {docName ? (
        <View style={styles.fileRow}>
          <Text style={styles.fileIcon}>📎</Text>
          <Text style={styles.fileName} numberOfLines={1}>{docName}</Text>
        </View>
      ) : query ? (
        <Text style={styles.query}>Results for "{query}"</Text>
      ) : null}

      <ScrollView style={styles.body} scrollEnabled={false}>
        {isSummary ? (
          <Text style={styles.content}>{content.slice(0, 500)}</Text>
        ) : (
          lines.slice(0, 8).map((line, i) => (
            <View key={i} style={[styles.fileItem, i < Math.min(lines.length, 8) - 1 && styles.fileBorder]}>
              <Text style={styles.fileItemIcon}>📄</Text>
              <Text style={styles.fileItemName} numberOfLines={1}>{line}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </Animated.View>
  );
}

const PURPLE = '#5856D6';

const styles = StyleSheet.create({
  card: { width: 300, backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: `${PURPLE}25`, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  emoji: { fontSize: 20 },
  title: { fontFamily: 'Syne_600SemiBold', fontSize: 13, color: PURPLE, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.bgSecondary, borderRadius: 10, padding: 10, marginBottom: 12 },
  fileIcon: { fontSize: 16 },
  fileName: { fontFamily: 'Syne_600SemiBold', fontSize: 13, color: Colors.text, flex: 1 },
  query: { fontFamily: 'Syne_400Regular', fontSize: 12, color: Colors.textSecondary, marginBottom: 10 },
  body: { maxHeight: 250 },
  content: { fontFamily: 'Syne_400Regular', fontSize: 13, color: Colors.text, lineHeight: 20 },
  fileItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  fileBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  fileItemIcon: { fontSize: 14 },
  fileItemName: { fontFamily: 'Syne_400Regular', fontSize: 13, color: Colors.text, flex: 1 },
});
