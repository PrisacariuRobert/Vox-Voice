import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { ActionStatus } from '../../types';
import { CalendarIcon, CheckIcon, ChatIcon } from '../Icons';

interface CalendarCardProps {
  content: string;
  metadata?: Record<string, unknown>;
  actionStatus?: ActionStatus | null;
  actionError?: string | null;
  actionProvider?: string | null;
  actionData?: Record<string, unknown> | null;
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

export function CalendarCard({ content, metadata, actionStatus, actionError, actionProvider, actionData }: CalendarCardProps) {
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

  // Check if this is a Teams meeting with a join link
  const isTeamsMeeting = actionProvider === 'Zoom';
  const joinUrl = (actionData?.joinUrl as string) ?? null;

  return (
    <Animated.View style={[styles.card, isTeamsMeeting && styles.teamsCard, animStyle]}>
      <View style={styles.header}>
        {isTeamsMeeting ? (
          <ChatIcon size={20} color={Colors.accent2} />
        ) : (
          <CalendarIcon size={20} color={Colors.accent} />
        )}
        <Text style={[styles.title, isTeamsMeeting && styles.teamsTitle]}>
          {isTeamsMeeting ? 'Zoom Meeting Created' : 'Event Added'}
        </Text>
      </View>

      {eventName ? (
        <>
          <Text style={styles.eventName}>{eventName}</Text>
          {eventTime && <Text style={styles.eventTime}>{eventTime}</Text>}
        </>
      ) : (
        <Text style={styles.content}>{content}</Text>
      )}

      {actionStatus === 'executing' ? (
        <View style={styles.executingBadge}>
          <ActivityIndicator size="small" color={Colors.accent} />
          <Text style={styles.executingText}>
            {isTeamsMeeting ? 'Creating Zoom meeting...' : 'Creating event...'}
          </Text>
        </View>
      ) : actionStatus === 'error' ? (
        <View style={styles.errorBadge}>
          <Text style={styles.errorText}>{actionError ?? 'Failed to create event'}</Text>
        </View>
      ) : actionStatus === 'success' ? (
        <>
          <View style={styles.successBadge}>
            <CheckIcon size={12} color={Colors.success} />
            <Text style={styles.successText}>
              {actionProvider ? `Added to ${actionProvider}` : 'Event Created'}
            </Text>
          </View>
          {joinUrl ? (
            <TouchableOpacity
              style={styles.joinBtn}
              onPress={() => Linking.openURL(joinUrl)}
            >
              <ChatIcon size={16} color="#fff" />
              <Text style={styles.joinBtnText}>Join Zoom Meeting</Text>
            </TouchableOpacity>
          ) : null}
        </>
      ) : null}

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
    gap: 8,
    marginBottom: 12,
  },
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
  executingBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accentDim,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  executingText: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 12,
    color: Colors.accent,
  },
  successBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52,199,89,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  successText: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 12,
    color: Colors.success,
  },
  errorBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,45,85,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  errorText: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 12,
    color: Colors.pink,
  },
  teamsCard: {
    borderColor: Colors.accent2Dim,
  },
  teamsTitle: {
    color: Colors.accent2,
  },
  joinBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent2,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  joinBtnText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 14,
    color: '#fff',
  },
});
