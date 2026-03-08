import { useState, useRef, useCallback, useEffect } from 'react';
import {
  useAudioRecorder,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';
import { transcribeAudio } from '../lib/whisper-stt';
import { AppSettings } from '../types';

const BURST_DURATION_MS = 2500;
const WAKE_CHECK_INTERVAL_MS = 3000;

export function useWakeWord({
  settings,
  enabled,
  onWake,
}: {
  settings: Pick<AppSettings, 'wakePhrases' | 'sttProvider' | 'whisperApiKey'>;
  enabled: boolean;
  onWake: () => void;
}) {
  const [listening, setListening] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const enabledRef = useRef(enabled);
  const mountedRef = useRef(true);
  const runningRef = useRef(false);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const _checkBurst = useCallback(async () => {
    if (!enabledRef.current || !mountedRef.current) return;
    if (settings.sttProvider !== 'whisper' || !settings.whisperApiKey) return;

    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();

      await new Promise<void>((r) => setTimeout(r, BURST_DURATION_MS));

      if (!enabledRef.current || !mountedRef.current) {
        await recorder.stop().catch(() => {});
        return;
      }

      await recorder.stop();
      const uri = recorder.uri;

      if (!uri) return;

      const result = await transcribeAudio(uri, settings.whisperApiKey);
      const lower = result.text.toLowerCase().trim();

      if (settings.wakePhrases.some((phrase) => lower.includes(phrase))) {
        if (mountedRef.current) onWake();
      }
    } catch {
      // best-effort, ignore errors
    }
  }, [recorder, settings, onWake]);

  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    setListening(true);
    const runLoop = async () => {
      while (enabledRef.current && mountedRef.current) {
        await _checkBurst();
        await new Promise<void>((r) =>
          setTimeout(r, WAKE_CHECK_INTERVAL_MS - BURST_DURATION_MS)
        );
      }
      runningRef.current = false;
      if (mountedRef.current) setListening(false);
    };
    runLoop();
  }, [_checkBurst]);

  const stop = useCallback(async () => {
    enabledRef.current = false;
    await recorder.stop().catch(() => {});
    if (mountedRef.current) setListening(false);
  }, [recorder]);

  return { listening, start, stop };
}
