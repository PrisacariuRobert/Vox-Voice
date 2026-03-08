import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { CloudSunIcon, CalendarIcon, MailIcon } from '../Icons';

interface BriefingCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

interface BriefingSection {
  icon: React.ReactElement;
  label: string;
  value: string;
}

export function BriefingCard({ content, metadata }: BriefingCardProps) {
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

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const sections = parseBriefingSections(content);

  return (
    <Animated.View style={[styles.card, animStyle]}>
      {/* Gradient header */}
      <View style={styles.headerBg}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.date}>{dateStr}</Text>
        <Text style={styles.time}>{timeStr}</Text>
      </View>

      <ScrollView style={styles.sections} scrollEnabled={false}>
        {sections.map((s, i) => (
          <View key={i} style={styles.section}>
            <View style={styles.sectionIcon}>{s.icon}</View>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionLabel}>{s.label}</Text>
              <Text style={styles.sectionValue} numberOfLines={2}>{s.value}</Text>
            </View>
          </View>
        ))}

        {sections.length === 0 && (
          <Text style={styles.fallback} numberOfLines={6}>{content.slice(0, 250)}</Text>
        )}
      </ScrollView>
    </Animated.View>
  );
}

function parseBriefingSections(text: string): BriefingSection[] {
  const sections: BriefingSection[] = [];

  // Weather
  const weatherMatch = text.match(/(?:weather|temperature|it'?s?).*?(\d+[°℃℉][^.\n]*)/i)
    || text.match(/(\d+[°℃℉][^.\n]+)/);
  if (weatherMatch) {
    sections.push({ icon: <CloudSunIcon size={22} />, label: 'Weather', value: weatherMatch[1].trim() });
  }

  // Calendar
  const calMatch = text.match(/(?:calendar|event|meeting|appointment)[^.\n]*(\d+)[^.\n]*/i)
    || text.match(/(\d+)\s+(?:event|meeting|appointment)/i);
  if (calMatch) {
    sections.push({ icon: <CalendarIcon size={22} />, label: 'Today', value: calMatch[0].replace(/^.*?(\d)/, '$1').trim().slice(0, 80) });
  }

  // Emails
  const emailMatch = text.match(/(\d+)\s+(?:new\s+)?(?:unread\s+)?email/i)
    || text.match(/email[^.\n]*(\d+)/i);
  if (emailMatch) {
    sections.push({ icon: <MailIcon size={22} />, label: 'Emails', value: emailMatch[0].trim().slice(0, 80) });
  }

  return sections.slice(0, 4);
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.accentDim,
    overflow: 'hidden',
  },
  headerBg: {
    backgroundColor: 'rgba(79,142,247,0.15)',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.accentDim,
  },
  greeting: {
    fontFamily: 'Syne_700Bold',
    fontSize: 20,
    color: Colors.text,
    marginBottom: 2,
  },
  date: {
    fontFamily: 'Syne_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  time: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 28,
    color: Colors.accent,
    marginTop: 4,
  },
  sections: {
    padding: 16,
    maxHeight: 180,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  sectionIcon: { width: 22, height: 22, alignItems: 'center' as const, marginTop: 1 },
  sectionContent: { flex: 1 },
  sectionLabel: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 11,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sectionValue: {
    fontFamily: 'Syne_400Regular',
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  fallback: {
    fontFamily: 'Syne_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
