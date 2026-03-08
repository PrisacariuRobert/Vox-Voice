import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Colors } from '../../constants/colors';

interface PackageCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

const STAGES = ['Ordered', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered'];

function getStageIndex(status: string): number {
  const s = status.toLowerCase();
  if (/deliver/i.test(s)) return 4;
  if (/out for/i.test(s)) return 3;
  if (/transit/i.test(s)) return 2;
  if (/ship/i.test(s)) return 1;
  return 0;
}

export function PackageCard({ content, metadata }: PackageCardProps) {
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

  const carrier = (metadata?.carrier as string) ?? '';
  const status = (metadata?.status as string) ?? '';
  const eta = (metadata?.eta as string) ?? '';
  const tracking = (metadata?.tracking as string) ?? '';
  const stageIdx = getStageIndex(status);

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>📦</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{carrier || 'Package'}</Text>
          {tracking ? <Text style={styles.tracking}>{tracking}</Text> : null}
        </View>
        {status ? (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.progress}>
        {STAGES.map((stage, i) => (
          <View key={i} style={styles.stageCol}>
            <View style={[styles.dot, i <= stageIdx ? styles.dotActive : styles.dotInactive]} />
            {i < STAGES.length - 1 && (
              <View style={[styles.connector, i < stageIdx ? styles.connectorActive : styles.connectorInactive]} />
            )}
            <Text style={[styles.stageLabel, i <= stageIdx && styles.stageLabelActive]} numberOfLines={1}>
              {stage}
            </Text>
          </View>
        ))}
      </View>

      {eta ? (
        <View style={styles.etaRow}>
          <Text style={styles.etaLabel}>Estimated Delivery</Text>
          <Text style={styles.etaValue}>{eta}</Text>
        </View>
      ) : null}

      {!carrier && !status && content ? (
        <Text style={styles.content} numberOfLines={4}>{content}</Text>
      ) : null}
    </Animated.View>
  );
}

const BROWN = '#A0522D';

const styles = StyleSheet.create({
  card: { width: 300, backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: `${BROWN}30`, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  emoji: { fontSize: 24 },
  label: { fontFamily: 'Syne_600SemiBold', fontSize: 15, color: Colors.text },
  tracking: { fontFamily: 'Syne_400Regular', fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  statusBadge: { backgroundColor: Colors.accentDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontFamily: 'Syne_600SemiBold', fontSize: 11, color: Colors.accent },
  progress: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  stageCol: { flex: 1, alignItems: 'center', position: 'relative' },
  dot: { width: 10, height: 10, borderRadius: 5, zIndex: 1 },
  dotActive: { backgroundColor: Colors.accent },
  dotInactive: { backgroundColor: Colors.surfaceBorder },
  connector: { position: 'absolute', top: 4, left: '50%', width: '100%', height: 2 },
  connectorActive: { backgroundColor: Colors.accent },
  connectorInactive: { backgroundColor: Colors.surfaceBorder },
  stageLabel: { fontFamily: 'Syne_400Regular', fontSize: 8, color: Colors.textTertiary, marginTop: 4, textAlign: 'center' },
  stageLabelActive: { color: Colors.accent, fontFamily: 'Syne_600SemiBold' },
  etaRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.bgSecondary, borderRadius: 10, padding: 12 },
  etaLabel: { fontFamily: 'Syne_400Regular', fontSize: 13, color: Colors.textSecondary },
  etaValue: { fontFamily: 'Syne_700Bold', fontSize: 14, color: Colors.text },
  content: { fontFamily: 'Syne_400Regular', fontSize: 14, color: Colors.text, lineHeight: 20 },
});
