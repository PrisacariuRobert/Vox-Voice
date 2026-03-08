import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { ConversationMessage } from '../../types';
import { getConversations, clearConversations } from '../../lib/conversation-store';
import { CardEngine } from '../../components/ActionCards/CardEngine';
import { ClockIcon } from '../../components/Icons';

export default function HistoryScreen() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // Reload conversation history every time this tab gets focus
  useFocusEffect(
    useCallback(() => {
      getConversations().then(setMessages);
    }, [])
  );

  const handleClear = useCallback(() => {
    if (messages.length === 0) return;
    Alert.alert(
      'Clear History',
      'Delete all conversation history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearConversations();
            setMessages([]);
          },
        },
      ]
    );
  }, [messages.length]);

  const formatTime = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (isToday) return time;
    if (isYesterday) return `Yesterday ${time}`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + time;
  };

  const renderItem = useCallback(({ item }: { item: ConversationMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
        <View style={styles.messageMeta}>
          <Text style={[styles.role, isUser ? styles.userRole : styles.assistantRole]}>
            {isUser ? 'You' : 'Claw'}
          </Text>
          <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
        </View>

        {isUser ? (
          <Text style={styles.userText}>{item.content}</Text>
        ) : (
          <>
            {/* Show card if one was generated */}
            {item.card ? (
              <View style={styles.cardContainer}>
                <CardEngine card={item.card} />
              </View>
            ) : (
              <Text style={styles.assistantText} numberOfLines={4}>
                {item.content.slice(0, 200)}
              </Text>
            )}
          </>
        )}
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        {messages.length > 0 && (
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clear}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, messages.length === 0 && styles.listEmpty]}
        showsVerticalScrollIndicator={true}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ClockIcon size={48} color={Colors.textTertiary} strokeWidth={1.2} />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the mic button on the Voice tab to get started
            </Text>
          </View>
        }
        renderItem={renderItem}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  title: {
    fontFamily: 'Syne_700Bold',
    fontSize: 28,
    color: Colors.text,
  },
  clear: {
    fontFamily: 'Syne_500Medium',
    fontSize: 14,
    color: Colors.pink,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  listEmpty: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 18,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontFamily: 'Syne_400Regular',
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  messageRow: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  userRow: {
    backgroundColor: Colors.accentDim,
    borderColor: 'rgba(0,122,255,0.15)',
  },
  assistantRow: {
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceBorder,
  },
  messageMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  role: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userRole: {
    color: Colors.accent,
  },
  assistantRole: {
    color: Colors.textSecondary,
  },
  timestamp: {
    fontFamily: 'Syne_400Regular',
    fontSize: 11,
    color: Colors.textTertiary,
  },
  userText: {
    fontFamily: 'Syne_400Regular',
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  assistantText: {
    fontFamily: 'Syne_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  cardContainer: {
    marginTop: 4,
    alignItems: 'flex-start',
  },
});
