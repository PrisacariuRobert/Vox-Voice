import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConversationMessage, CardData } from '../types';

const STORE_KEY = '@claw_conversations';
const MAX_MESSAGES = 200;

let cache: ConversationMessage[] | null = null;

export async function getConversations(): Promise<ConversationMessage[]> {
  if (cache) return cache;
  try {
    const json = await AsyncStorage.getItem(STORE_KEY);
    if (json) {
      const parsed = JSON.parse(json) as ConversationMessage[];
      // Restore Date objects
      cache = parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
      return cache;
    }
  } catch {}
  cache = [];
  return cache;
}

export async function addMessage(
  role: 'user' | 'assistant',
  content: string,
  card?: CardData,
): Promise<ConversationMessage> {
  const messages = await getConversations();
  const msg: ConversationMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    timestamp: new Date(),
    card,
  };
  messages.push(msg);

  // Trim oldest if over limit
  if (messages.length > MAX_MESSAGES) {
    messages.splice(0, messages.length - MAX_MESSAGES);
  }

  cache = messages;
  await persist(messages);
  return msg;
}

export async function clearConversations(): Promise<void> {
  cache = [];
  await AsyncStorage.removeItem(STORE_KEY);
}

async function persist(messages: ConversationMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(messages));
  } catch {}
}
