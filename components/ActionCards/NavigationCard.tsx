import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { MapPinIcon } from '../Icons';

interface NavigationCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

export function NavigationCard({ content, metadata }: NavigationCardProps) {
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

  const destination = (metadata?.destination as string) ?? '';
  const eta = (metadata?.eta as string) ?? '';
  const distance = (metadata?.distance as string) ?? '';

  const openMaps = () => {
    if (destination) {
      Linking.openURL(`http://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`);
    }
  };

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <MapPinIcon size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>NAVIGATION</Text>
          {destination ? <Text style={styles.destination} numberOfLines={2}>{destination}</Text> : null}
        </View>
      </View>

      {(eta || distance) ? (
        <View style={styles.infoRow}>
          {eta ? (
            <View style={styles.infoBadge}>
              <Text style={styles.infoLabel}>ETA</Text>
              <Text style={styles.infoValue}>{eta}</Text>
            </View>
          ) : null}
          {distance ? (
            <View style={styles.infoBadge}>
              <Text style={styles.infoLabel}>Distance</Text>
              <Text style={styles.infoValue}>{distance}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {!destination && content ? (
        <Text style={styles.content} numberOfLines={3}>{content}</Text>
      ) : null}

      <TouchableOpacity style={styles.button} onPress={openMaps} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Open in Maps</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 300, backgroundColor: Colors.surface, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(0, 122, 255, 0.25)', padding: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.accentDim,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontFamily: 'Syne_600SemiBold', fontSize: 11, color: Colors.accent, letterSpacing: 1 },
  destination: { fontFamily: 'Syne_700Bold', fontSize: 16, color: Colors.text, marginTop: 2 },
  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  infoBadge: {
    flex: 1, backgroundColor: Colors.bgSecondary, borderRadius: 10, padding: 10, alignItems: 'center',
  },
  infoLabel: { fontFamily: 'Syne_400Regular', fontSize: 11, color: Colors.textSecondary },
  infoValue: { fontFamily: 'Syne_700Bold', fontSize: 16, color: Colors.text, marginTop: 2 },
  content: { fontFamily: 'Syne_400Regular', fontSize: 14, color: Colors.text, lineHeight: 20, marginBottom: 12 },
  button: { backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buttonText: { fontFamily: 'Syne_600SemiBold', fontSize: 14, color: '#fff' },
});
