import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';

interface MessageSentCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

export function MessageSentCard({ content, metadata }: MessageSentCardProps) {
  const translateY = useSharedValue(200);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 12 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const to = (metadata?.to as string) ?? extractRecipient(content);

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.header}>
        <Text style={styles.icon}>💬</Text>
        <Text style={styles.title}>Message Sent</Text>
      </View>

      {to && (
        <View style={styles.recipientRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{to.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.toLabel}>To</Text>
            <Text style={styles.recipient}>{to}</Text>
          </View>
        </View>
      )}

      <View style={styles.bubble}>
        <Text style={styles.bubbleText} numberOfLines={3}>
          {extractMessageBody(content)}
        </Text>
      </View>

      <Text style={styles.sent}>✓ Sent via iMessage</Text>
    </Animated.View>
  );
}

function extractRecipient(text: string): string | null {
  const m = text.match(/(?:sent.*?to|message.*?to|texted)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  return m?.[1] ?? null;
}

function extractMessageBody(text: string): string {
  const m = text.match(/(?:saying|message:|text:|content:)\s*["']?([^"'\n]+)["']?/i);
  return m?.[1] ?? text.slice(0, 120);
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.3)',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  icon: { fontSize: 20, marginRight: 8 },
  title: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 13,
    color: '#007AFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
    color: '#fff',
  },
  toLabel: {
    fontFamily: 'Syne_400Regular',
    fontSize: 11,
    color: Colors.textTertiary,
  },
  recipient: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  bubble: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 12,
    marginBottom: 10,
  },
  bubbleText: {
    fontFamily: 'Syne_400Regular',
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  sent: {
    fontFamily: 'Syne_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'right',
  },
});
