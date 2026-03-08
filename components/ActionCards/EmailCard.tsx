import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { ActionStatus } from '../../types';
import { SendIcon, InboxIcon, CheckIcon } from '../Icons';

interface EmailCardProps {
  content: string;
  metadata?: Record<string, unknown>;
  actionStatus?: ActionStatus | null;
  actionError?: string | null;
  actionProvider?: string | null;
}

interface ParsedEmail {
  from?: string;
  subject?: string;
  body?: string;
  date?: string;
}

function parseEmailList(text: string): ParsedEmail[] {
  const emails: ParsedEmail[] = [];
  const blocks = text.split(/\n?---\n?/).filter(b => b.trim());
  for (const block of blocks) {
    const fromMatch = block.match(/From:\s*(.+)/i);
    const subjectMatch = block.match(/Subject:\s*(.+)/i);
    const dateMatch = block.match(/Date:\s*(.+)/i);
    const bodyMatch = block.match(/Body:\s*([\s\S]+)/i);
    if (fromMatch || subjectMatch) {
      emails.push({
        from: fromMatch?.[1]?.trim(),
        subject: subjectMatch?.[1]?.trim(),
        date: dateMatch?.[1]?.trim(),
        body: bodyMatch?.[1]?.trim().slice(0, 200),
      });
    }
  }
  return emails;
}

function isSentEmail(content: string): boolean {
  return /email sent|sent.*email|sent.*to|delivered|message.*sent/i.test(content);
}

export function EmailCard({ content, metadata, actionStatus, actionError, actionProvider }: EmailCardProps) {
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

  const isSent = isSentEmail(content);
  const to = metadata?.to as string | undefined;
  const subject = metadata?.subject as string | undefined;
  const emailList = !isSent ? parseEmailList(content) : [];
  const hasEmailList = emailList.length > 0;

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.header}>
        {isSent ? <SendIcon size={20} /> : <InboxIcon size={20} />}
        <Text style={styles.title}>{isSent ? 'Email Sent' : 'Inbox'}</Text>
        {!isSent && emailList.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{emailList.length}</Text>
          </View>
        )}
      </View>

      {isSent && (
        <>
          {to && (
            <View style={styles.row}>
              <Text style={styles.label}>To</Text>
              <Text style={styles.value}>{to}</Text>
            </View>
          )}
          {subject && (
            <View style={styles.row}>
              <Text style={styles.label}>Subject</Text>
              <Text style={styles.value}>{subject}</Text>
            </View>
          )}
          {!to && !subject && (
            <Text style={styles.content}>{content}</Text>
          )}
          {actionStatus === 'executing' ? (
            <View style={styles.executingBadge}>
              <ActivityIndicator size="small" color={Colors.accent} />
              <Text style={styles.executingText}>Sending...</Text>
            </View>
          ) : actionStatus === 'error' ? (
            <View style={styles.errorBadge}>
              <Text style={styles.errorText}>{actionError ?? 'Failed to send'}</Text>
            </View>
          ) : (
            <View style={styles.sentBadge}>
              <CheckIcon size={12} color={Colors.success} />
              <Text style={styles.sentText}>
                {actionStatus === 'success' && actionProvider
                  ? `Sent via ${actionProvider}`
                  : 'Delivered'}
              </Text>
            </View>
          )}
        </>
      )}

      {!isSent && hasEmailList && (
        <ScrollView style={styles.emailList} scrollEnabled={false}>
          {emailList.map((email, i) => (
            <View key={i} style={[styles.emailItem, i < emailList.length - 1 && styles.emailItemBorder]}>
              <View style={styles.emailAvatar}>
                <Text style={styles.emailAvatarText}>
                  {(email.from ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.emailItemInfo}>
                <Text style={styles.emailFrom} numberOfLines={1}>{email.from ?? 'Unknown'}</Text>
                <Text style={styles.emailSubject} numberOfLines={1}>{email.subject ?? '(no subject)'}</Text>
                {email.date ? <Text style={styles.emailDate} numberOfLines={1}>{email.date}</Text> : null}
                {email.body ? <Text style={styles.emailBody} numberOfLines={2}>{email.body}</Text> : null}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {!isSent && !hasEmailList && (
        <Text style={styles.content}>{content}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.successDim,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 13,
    color: Colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  countBadge: {
    backgroundColor: Colors.successDim,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 12,
    color: Colors.success,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 13,
    color: Colors.textTertiary,
    width: 56,
  },
  value: {
    fontFamily: 'Syne_400Regular',
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  content: {
    fontFamily: 'Syne_400Regular',
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  sentBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successDim,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sentText: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 12,
    color: Colors.success,
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
  emailList: { maxHeight: 300 },
  emailItem: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
  },
  emailItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  emailAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emailAvatarText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
    color: Colors.accent,
  },
  emailItemInfo: { flex: 1 },
  emailFrom: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 13,
    color: Colors.text,
  },
  emailSubject: {
    fontFamily: 'Syne_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  emailDate: {
    fontFamily: 'Syne_400Regular',
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  emailBody: {
    fontFamily: 'Syne_400Regular',
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 3,
    lineHeight: 15,
    fontStyle: 'italic',
  },
});
