import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Colors } from '../../constants/colors';

interface FlightCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

export function FlightCard({ content, metadata }: FlightCardProps) {
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

  const number = (metadata?.number as string) ?? '';
  const status = (metadata?.status as string) ?? '';
  const from = (metadata?.from as string) ?? '';
  const to = (metadata?.to as string) ?? '';
  const departure = (metadata?.departure as string) ?? '';
  const arrival = (metadata?.arrival as string) ?? '';
  const gate = (metadata?.gate as string) ?? '';

  const statusColor = /landed|arrived/i.test(status) ? Colors.success
    : /delayed|cancelled/i.test(status) ? Colors.pink
    : Colors.accent;

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>✈️</Text>
        <Text style={styles.flightNum}>{number || 'Flight'}</Text>
        {status ? (
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
          </View>
        ) : null}
      </View>

      {(from || to) ? (
        <View style={styles.route}>
          <View style={styles.airport}>
            <Text style={styles.code}>{from || '—'}</Text>
            {departure ? <Text style={styles.time}>{departure}</Text> : null}
          </View>
          <View style={styles.routeLine}>
            <View style={styles.dot} />
            <View style={styles.line} />
            <Text style={styles.plane}>✈</Text>
            <View style={styles.line} />
            <View style={styles.dot} />
          </View>
          <View style={[styles.airport, { alignItems: 'flex-end' }]}>
            <Text style={styles.code}>{to || '—'}</Text>
            {arrival ? <Text style={styles.time}>{arrival}</Text> : null}
          </View>
        </View>
      ) : null}

      {gate ? (
        <View style={styles.gateRow}>
          <Text style={styles.gateLabel}>Gate</Text>
          <Text style={styles.gateValue}>{gate}</Text>
        </View>
      ) : null}

      {!from && !to && content ? (
        <Text style={styles.content} numberOfLines={4}>{content}</Text>
      ) : null}
    </Animated.View>
  );
}

const BLUE = '#007AFF';

const styles = StyleSheet.create({
  card: { width: 300, backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: `${BLUE}25`, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  emoji: { fontSize: 20 },
  flightNum: { fontFamily: 'Syne_700Bold', fontSize: 18, color: Colors.text, flex: 1 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontFamily: 'Syne_600SemiBold', fontSize: 12 },
  route: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  airport: { flex: 1 },
  code: { fontFamily: 'Syne_700Bold', fontSize: 22, color: Colors.text },
  time: { fontFamily: 'Syne_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  routeLine: { flexDirection: 'row', alignItems: 'center', flex: 1, marginHorizontal: 8, gap: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  line: { flex: 1, height: 1, backgroundColor: Colors.surfaceBorder },
  plane: { fontSize: 14, color: Colors.accent },
  gateRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.bgSecondary, borderRadius: 10, padding: 12 },
  gateLabel: { fontFamily: 'Syne_400Regular', fontSize: 13, color: Colors.textSecondary },
  gateValue: { fontFamily: 'Syne_700Bold', fontSize: 15, color: Colors.text },
  content: { fontFamily: 'Syne_400Regular', fontSize: 14, color: Colors.text, lineHeight: 20 },
});
