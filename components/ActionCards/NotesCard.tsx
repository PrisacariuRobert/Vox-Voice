import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { NoteIcon, SmartphoneIcon } from '../Icons';

interface NotesCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

export function NotesCard({ content, metadata }: NotesCardProps) {
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

  const isCreated = /created|saved|added/i.test(content);
  const title = extractTitle(content);
  const noteLines = extractNoteLines(content);

  return (
    <Animated.View style={[styles.card, animStyle]}>
      {/* Yellow top bar like real Apple Notes */}
      <View style={styles.topBar} />

      <View style={styles.header}>
        <NoteIcon size={18} color={Colors.warning} />
        <Text style={styles.title}>{isCreated ? 'Note Saved' : 'Notes'}</Text>
      </View>

      {title && <Text style={styles.noteTitle}>{title}</Text>}

      <ScrollView style={styles.linesContainer} scrollEnabled={false}>
        {noteLines.length > 0 ? (
          noteLines.map((line, i) => (
            <View key={i} style={styles.line}>
              <View style={styles.lineRule} />
              <Text style={styles.lineText}>{line}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.content}>{content.slice(0, 150)}</Text>
        )}
      </ScrollView>

      <View style={styles.footerRow}>
        <SmartphoneIcon size={12} color={Colors.textTertiary} />
        <Text style={styles.footer}>Saved to Apple Notes</Text>
      </View>
    </Animated.View>
  );
}

function extractTitle(text: string): string | null {
  const m = text.match(/note.*?["']([^"']+)["']/i)
    || text.match(/titled?\s+["']?([^\n"',.]+)/i);
  return m?.[1] ?? null;
}

function extractNoteLines(text: string): string[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length <= 1) return [];
  return lines.slice(0, 5);
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    backgroundColor: '#1c1a0f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.3)',
    overflow: 'hidden',
  },
  topBar: {
    height: 4,
    backgroundColor: Colors.warning,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 13,
    color: Colors.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteTitle: {
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
    color: Colors.text,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  linesContainer: {
    paddingHorizontal: 16,
    maxHeight: 120,
  },
  line: {
    marginBottom: 6,
  },
  lineRule: {
    height: 1,
    backgroundColor: 'rgba(245,166,35,0.1)',
    marginBottom: 3,
  },
  lineText: {
    fontFamily: 'Syne_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  content: {
    fontFamily: 'Syne_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    padding: 12,
    paddingTop: 8,
  },
  footer: {
    fontFamily: 'Syne_400Regular',
    fontSize: 11,
    color: Colors.textTertiary,
  },
});
