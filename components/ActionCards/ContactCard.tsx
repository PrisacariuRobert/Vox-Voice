import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { ContactData } from '../../types';

interface ContactCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

export function ContactCard({ content, metadata }: ContactCardProps) {
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

  const contact = metadata?.contact as ContactData | undefined;
  const name = contact?.name ?? extractName(content);
  const email = contact?.email ?? extractEmail(content);
  const phone = contact?.phone ?? extractPhone(content);
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.header}>
        <Text style={styles.icon}>👤</Text>
        <Text style={styles.title}>Contact</Text>
      </View>

      <View style={styles.profileRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.nameBlock}>
          <Text style={styles.name}>{name ?? 'Contact'}</Text>
          {email && <Text style={styles.detail}>{email}</Text>}
          {phone && <Text style={styles.detail}>{phone}</Text>}
        </View>
      </View>

      <View style={styles.actions}>
        {phone && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)}
          >
            <Text style={styles.actionIcon}>📞</Text>
            <Text style={styles.actionLabel}>Call</Text>
          </TouchableOpacity>
        )}
        {email && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Linking.openURL(`mailto:${email}`)}
          >
            <Text style={styles.actionIcon}>✉️</Text>
            <Text style={styles.actionLabel}>Email</Text>
          </TouchableOpacity>
        )}
        {phone && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Linking.openURL(`sms:${phone.replace(/\s/g, '')}`)}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionLabel}>Message</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

function extractName(text: string): string | null {
  const m = text.match(/(?:contact|found|calling)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  return m?.[1] ?? null;
}

function extractEmail(text: string): string | null {
  const m = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  return m?.[0] ?? null;
}

function extractPhone(text: string): string | null {
  const m = text.match(/(?:\+?\d[\d\s\-().]{7,})/);
  return m?.[0]?.trim() ?? null;
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.accent2Dim,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: { fontSize: 18, marginRight: 8 },
  title: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 13,
    color: Colors.accent2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 22,
    color: '#fff',
  },
  nameBlock: { flex: 1 },
  name: {
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 4,
  },
  detail: {
    fontFamily: 'Syne_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: 'rgba(124,106,244,0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: { fontSize: 18 },
  actionLabel: {
    fontFamily: 'Syne_500Medium',
    fontSize: 11,
    color: Colors.accent2,
  },
});
