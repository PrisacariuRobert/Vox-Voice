import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';

interface CalendarCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

function MiniCalendar() {
  const today = new Date();
  const day = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();

  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  // Show only first 3 weeks (21 days) to keep card compact
  const visible = days.slice(0, 21);

  return (
    <View style={cal.container}>
      {['S','M','T','W','T','F','S'].map((d, i) => (
        <Text key={i} style={cal.dow}>{d}</Text>
      ))}
      {visible.map((d, i) => (
        <View
          key={i}
          style={[cal.cell, d === day && cal.todayCell]}
        >
          {d ? (
            <Text style={[cal.day, d === day && cal.todayText]}>{d}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function CalendarCard({ content, metadata }: CalendarCardProps) {
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

  // Extract event details from content
  const eventName = (metadata?.event_name as string) ?? extractEventName(content);
  const eventTime = (metadata?.event_time as string) ?? extractEventTime(content);

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.header}>
        <Text style={styles.icon}>📅</Text>
        <Text style={styles.title}>Event Added</Text>
      </View>

      {eventName ? (
        <>
          <Text style={styles.eventName}>{eventName}</Text>
          {eventTime && <Text style={styles.eventTime}>{eventTime}</Text>}
        </>
      ) : (
        <Text style={styles.content}>{content}</Text>
      )}

      <MiniCalendar />
    </Animated.View>
  );
}

function extractEventName(text: string): string | null {
  const match = text.match(/"([^"]+)"|'([^']+)'|added\s+(.+?)\s+(?:to|on|at|for)/i);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function extractEventTime(text: string): string | null {
  const match = text.match(/(?:at|on|for)\s+(.{5,40}?)(?:\.|,|$)/i);
  return match?.[1] ?? null;
}

const cal = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    width: 7 * 32,
  },
  dow: {
    width: 32,
    textAlign: 'center',
    fontFamily: 'Syne_600SemiBold',
    fontSize: 10,
    color: Colors.textTertiary,
    paddingBottom: 4,
  },
  cell: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCell: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
  },
  day: {
    fontFamily: 'Syne_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  todayText: {
    color: '#fff',
    fontFamily: 'Syne_700Bold',
  },
});

const styles = StyleSheet.create({
  card: {
    width: 300,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.accentDim,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: { fontSize: 20, marginRight: 8 },
  title: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 13,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventName: {
    fontFamily: 'Syne_700Bold',
    fontSize: 20,
    color: Colors.text,
    marginBottom: 4,
  },
  eventTime: {
    fontFamily: 'Syne_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  content: {
    fontFamily: 'Syne_400Regular',
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
});
