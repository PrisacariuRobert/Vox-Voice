import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Colors } from '../../constants/colors';

interface DocumentCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

interface ParsedFile {
  name: string;
  path: string;
  date?: string;
}

function parseFiles(text: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);

  for (const line of lines) {
    // Try to extract file path (absolute paths like /Users/... or ~/...)
    const pathMatch = line.match(/(\/[\w\-./\s]+\.\w{2,5}|~\/[\w\-./\s]+\.\w{2,5})/);
    if (pathMatch) {
      const fullPath = pathMatch[1].trim();
      const name = fullPath.split('/').pop() ?? fullPath;
      // Try to find a date in the line
      const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
      files.push({ name, path: fullPath, date: dateMatch?.[1] });
      continue;
    }

    // Fallback: numbered or bulleted items with file-like names
    const clean = line.replace(/^[•\-*\s]*\d+[.)]\s*/, '').replace(/^[•\-*\s]+/, '').trim();
    if (clean.length > 3 && /\.\w{2,5}/.test(clean)) {
      // Has a file extension
      const parts = clean.split(/\s*[-–—]\s*|\s*:\s*/);
      const name = parts[0].trim();
      files.push({ name, path: '', date: parts[1]?.trim() });
    }
  }
  return files.slice(0, 8);
}

function getFileEmoji(name: string): string {
  if (/\.pdf$/i.test(name)) return '📕';
  if (/\.(doc|docx)$/i.test(name)) return '📘';
  if (/\.(xls|xlsx|csv)$/i.test(name)) return '📊';
  if (/\.(ppt|pptx|key)$/i.test(name)) return '📙';
  if (/\.(jpg|jpeg|png|gif|heic)$/i.test(name)) return '🖼️';
  if (/\.(mp4|mov|avi)$/i.test(name)) return '🎬';
  if (/\.(txt|md|rtf)$/i.test(name)) return '📝';
  if (/\.(zip|gz|tar)$/i.test(name)) return '📦';
  return '📄';
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

  const files = isSummary ? [] : parseFiles(content);
  const fallbackLines = content.split('\n').map(l => l.trim()).filter(l => l.length > 3);

  const openFile = (path: string, name: string) => {
    if (path) {
      // Open file using system default app
      Linking.openURL(`file://${path}`).catch(() => {
        // Fallback: try shareable URL or show file name in finder
        Linking.openURL(`file://${path.replace(/\/[^/]+$/, '/')}`).catch(() => {});
      });
    }
  };

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{isSummary ? '📄' : '🔍'}</Text>
        <Text style={styles.title}>{isSummary ? 'Document Summary' : 'Document Search'}</Text>
      </View>

      {docName ? (
        <TouchableOpacity style={styles.fileRow} activeOpacity={0.7} onPress={() => openFile('', docName)}>
          <Text style={styles.fileIcon}>{getFileEmoji(docName)}</Text>
          <Text style={styles.fileName} numberOfLines={1}>{docName}</Text>
          <Text style={styles.openLabel}>Open</Text>
        </TouchableOpacity>
      ) : query ? (
        <Text style={styles.query}>Results for "{query}"</Text>
      ) : null}

      <ScrollView style={styles.body} scrollEnabled={false}>
        {isSummary ? (
          <Text style={styles.content}>{content.slice(0, 500)}</Text>
        ) : files.length > 0 ? (
          files.map((file, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.fileItem, i < files.length - 1 && styles.fileBorder]}
              activeOpacity={0.7}
              onPress={() => openFile(file.path, file.name)}
            >
              <Text style={styles.fileItemIcon}>{getFileEmoji(file.name)}</Text>
              <Text style={[styles.fileItemName, { flex: 1 }]} numberOfLines={1}>{file.name}</Text>
              {file.path ? <Text style={styles.openArrow}>→</Text> : null}
            </TouchableOpacity>
          ))
        ) : (
          fallbackLines.slice(0, 8).map((line, i) => (
            <View key={i} style={[styles.fileItem, i < Math.min(fallbackLines.length, 8) - 1 && styles.fileBorder]}>
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
  openLabel: { fontFamily: 'Syne_600SemiBold', fontSize: 11, color: PURPLE },
  query: { fontFamily: 'Syne_400Regular', fontSize: 12, color: Colors.textSecondary, marginBottom: 10 },
  body: { maxHeight: 300 },
  content: { fontFamily: 'Syne_400Regular', fontSize: 13, color: Colors.text, lineHeight: 20 },
  fileItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  fileBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  fileItemIcon: { fontSize: 16 },
  fileItemName: { fontFamily: 'Syne_600SemiBold', fontSize: 13, color: Colors.text },
  openArrow: { fontFamily: 'Syne_600SemiBold', fontSize: 16, color: PURPLE },
});
