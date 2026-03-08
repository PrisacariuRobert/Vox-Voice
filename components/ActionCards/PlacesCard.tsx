import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { MapPinIcon } from '../Icons';

interface PlacesCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

function parsePlaces(text: string): { name: string; detail: string }[] {
  const places: { name: string; detail: string }[] = [];
  const lines = text.split('\n').filter(l => l.trim().length > 5);
  for (const line of lines.slice(0, 5)) {
    // Strip numbered prefix like "1. " or "1) " or bullet points
    const clean = line.replace(/^[•\-*\s]*\d+[.)]\s*/, '').replace(/^[•\-*\s]+/, '').trim();
    // Try splitting on dash, colon, or em-dash (name — detail)
    const parts = clean.split(/\s*[-–—]\s*|\s*:\s*/);
    if (parts.length >= 2 && parts[0].length > 2) {
      places.push({ name: parts[0].trim(), detail: parts.slice(1).join(' - ').trim() });
    } else if (clean.length > 5) {
      places.push({ name: clean, detail: '' });
    }
  }
  return places;
}

export function PlacesCard({ content, metadata }: PlacesCardProps) {
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

  const query = (metadata?.query as string) ?? '';
  const places = parsePlaces(content);

  const openInMaps = (name: string) => {
    Linking.openURL(`http://maps.apple.com/?q=${encodeURIComponent(name)}`);
  };

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>📍</Text>
        <Text style={styles.title}>Nearby Places</Text>
        {query ? <Text style={styles.query}>{query}</Text> : null}
      </View>

      <ScrollView style={styles.list} scrollEnabled={false}>
        {places.length > 0 ? places.map((p, i) => (
          <TouchableOpacity key={i} style={[styles.row, i < places.length - 1 && styles.rowBorder]} onPress={() => openInMaps(p.name)} activeOpacity={0.7}>
            <View style={styles.pinCircle}><MapPinIcon size={14} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.placeName} numberOfLines={1}>{p.name}</Text>
              {p.detail ? <Text style={styles.placeDetail} numberOfLines={1}>{p.detail}</Text> : null}
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        )) : (
          <Text style={styles.content}>{content.slice(0, 300)}</Text>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const ORANGE = '#FF9500';

const styles = StyleSheet.create({
  card: { width: 300, backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: `${ORANGE}30`, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  emoji: { fontSize: 18 },
  title: { fontFamily: 'Syne_600SemiBold', fontSize: 13, color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  query: { fontFamily: 'Syne_400Regular', fontSize: 11, color: Colors.textTertiary },
  list: { maxHeight: 280 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  pinCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: `${ORANGE}15`, alignItems: 'center', justifyContent: 'center' },
  placeName: { fontFamily: 'Syne_600SemiBold', fontSize: 14, color: Colors.text },
  placeDetail: { fontFamily: 'Syne_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  arrow: { fontFamily: 'Syne_600SemiBold', fontSize: 16, color: ORANGE },
  content: { fontFamily: 'Syne_400Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
});
