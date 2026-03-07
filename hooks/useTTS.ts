import { useState, useRef, useCallback } from 'react';
import { setAudioModeAsync, AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { kokoroSpeak } from '../lib/kokoro-tts';
import { googleSpeak } from '../lib/google-tts';
import { openAiSpeak, OpenAIVoice } from '../lib/openai-tts';
import { AppSettings } from '../types';

export type TTSState = 'idle' | 'speaking';

export function useTTS(settings: Pick<AppSettings, 'ttsProvider' | 'openaiTtsVoice' | 'kokoroUrl' | 'kokoroApiKey' | 'kokoroVoice' | 'googleTtsApiKey' | 'whisperApiKey'>) {
  const [state, setState] = useState<TTSState>('idle');
  const playerRef = useRef<AudioPlayer | null>(null);

  const stop = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.remove();
      playerRef.current = null;
    }
    Speech.stop();
    setState('idle');
  }, []);

  const speak = useCallback(
    async (text: string) => {
      stop();
      setState('speaking');

      // Play through speaker even in silent mode
      await setAudioModeAsync({ playsInSilentMode: true });

      try {
        let player: AudioPlayer | null = null;

        if (settings.ttsProvider === 'openai') {
          player = await openAiSpeak(
            text,
            settings.whisperApiKey,
            (settings.openaiTtsVoice as OpenAIVoice) || 'nova'
          );
        } else if (settings.ttsProvider === 'kokoro') {
          player = await kokoroSpeak(
            text,
            settings.kokoroUrl,
            settings.kokoroApiKey,
            settings.kokoroVoice
          );
        } else if (settings.ttsProvider === 'google') {
          player = await googleSpeak(text, settings.googleTtsApiKey);
        }

        if (player) {
          playerRef.current = player;
          player.play();
          const unsub = player.addListener('playbackStatusUpdate', (status) => {
            if (!status.playing && status.currentTime > 0) {
              unsub.remove();
              playerRef.current = null;
              setState('idle');
            }
          });
          return;
        }
      } catch (err) {
        console.warn('[TTS] Primary provider failed, falling back to device TTS:', err);
      }

      // Device TTS fallback
      Speech.speak(text, {
        rate: 1.05,
        onDone: () => setState('idle'),
        onError: () => setState('idle'),
      });
    },
    [settings, stop]
  );

  return { state, speak, stop };
}
