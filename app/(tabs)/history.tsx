import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { ConversationMessage } from '../../types';

// Placeholder — will be populated from conversation store in Step 12
const EMPTY: ConversationMessage[] = [];

export default function HistoryScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <TouchableOpacity>
          <Text style={styles.clear}>Clear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={EMPTY}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>◎</Text>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the mic button on the Voice tab to get started
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.messageRow}>
            <Text style={styles.role}>{item.role === 'user' ? 'You' : 'Claw'}</Text>
            <Text style={styles.messageText}>{item.content}</Text>
          </View>
        )}
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
    color: Colors.accent,
  },
  list: {
    flexGrow: 1,
    padding: 16,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    color: Colors.textTertiary,
    marginBottom: 16,
  },
  emptyText: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: 'Syne_400Regular',
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  messageRow: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  role: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 12,
    color: Colors.accent,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageText: {
    fontFamily: 'Syne_400Regular',
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
});
