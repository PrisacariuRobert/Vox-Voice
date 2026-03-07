import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';

interface MapsCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

export function MapsCard({ content, metadata }: MapsCardProps) {
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

  const destination = (metadata?.destination as string) ?? extractDestination(content);

  const openMaps = () => {
    if (destination) {
      const encoded = encodeURIComponent(destination);
      Linking.openURL(`https://maps.apple.com/?daddr=${encoded}`);
    }
  };

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapEmoji}>🗺</Text>
        <View style={styles.pin} />
      </View>

      <View style={styles.info}>
        <View style={styles.header}>
          <Text style={styles.icon}>📍</Text>
          <Text style={styles.title}>Navigation</Text>
        </View>

        {destination ? (
          <Text style={styles.destination}>{destination}</Text>
        ) : (
          <Text style={styles.content} numberOfLines={2}>{content}</Text>
        )}

        <TouchableOpacity style={styles.openButton} onPress={openMaps} activeOpacity={0.8}>
          <Text style={styles.openButtonText}>Open in Maps →</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function extractDestination(text: string): string | null {
  const m = text.match(/(?:navigate?|directions?|route|going)\s+to\s+(.{3,40})(?:\.|,|$)/i)
    || text.match(/(?:opening|opened).*?maps.*?for\s+(.{3,40})(?:\.|,|$)/i);
  return m?.[1]?.trim() ?? null;
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
    overflow: 'hidden',
  },
  mapPlaceholder: {
    height: 100,
    backgroundColor: '#1a2a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapEmoji: { fontSize: 40, opacity: 0.6 },
  pin: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#fff',
  },
  info: { padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: { fontSize: 18, marginRight: 6 },
  title: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 13,
    color: '#FF3B30',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  destination: {
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 12,
  },
  content: {
    fontFamily: 'Syne_400Regular',
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  openButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  openButtonText: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 14,
    color: '#fff',
  },
});
