import { useState, useEffect, useRef, useCallback } from 'react';
import { openClawClient } from '../lib/openclaw-client';
import { OpenClawMessage, ConnectionStatus, ConversationMessage } from '../types';

interface UseOpenClawOptions {
  url: string;
  token?: string;
  session?: string;
}

export function useOpenClaw({ url, token = '', session = 'main' }: UseOpenClawOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');
  // lastMessage is set to the full response once the stream completes.
  // Index screen watches this to transition thinking → speaking reliably.
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const streamRef = useRef('');

  useEffect(() => {
    if (!url) return;

    openClawClient.connect(url, token);

    const unsubStatus = openClawClient.onStatus(setStatus);
    const unsubMsg = openClawClient.onMessage((msg: OpenClawMessage) => {
      if (msg.type === 'chunk' && msg.content) {
        streamRef.current += msg.content;
        setStreamingText(streamRef.current);
      } else if (msg.type === 'done') {
        const full = streamRef.current;
        streamRef.current = '';
        setStreamingText('');
        if (full) {
          // Set lastMessage AFTER clearing streamingText so the index screen
          // can react to a clean "response is ready" signal
          setLastMessage(full);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: full,
              timestamp: new Date(),
            },
          ]);
        }
      }
    });

    return () => {
      unsubStatus();
      unsubMsg();
      openClawClient.disconnect();
    };
  }, [url, token]);

  const send = useCallback(
    (content: string) => {
      // Clear last message so the "done" effect fires fresh on next response
      setLastMessage(null);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'user',
          content,
          timestamp: new Date(),
        },
      ]);
      openClawClient.send(content, session);
    },
    [session]
  );

  const connect = useCallback(() => {
    openClawClient.connect(url, token);
  }, [url, token]);

  const disconnect = useCallback(() => {
    openClawClient.disconnect();
  }, []);

  return { send, messages, streamingText, lastMessage, status, connect, disconnect };
}
