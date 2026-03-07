import { useState, useRef, useCallback, useEffect } from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
  AudioRecorder,
} from 'expo-audio';
import { transcribeAudio } from '../lib/whisper-stt';
import { AppSettings } from '../types';
import { SILENCE_THRESHOLD_DB, SILENCE_DURATION_MS } from '../constants/config';

export type VoiceInputState = 'idle' | 'recording' | 'processing';

interface UseVoiceInputOptions {
  settings: Pick<AppSettings, 'sttProvider' | 'whisperApiKey'>;
  onTranscript?: (text: string) => void;
}

// Normalize dB metering (-160..0) → 0..1
function normalizeDb(db: number): number {
  return Math.max(0, Math.min(1, (db + 60) / 60));
}

export function useVoiceInput({ settings, onTranscript }: UseVoiceInputOptions) {
  const [state, setState] = useState<VoiceInputState>('idle');
  const [transcript, setTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 100);

  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      _clearSilenceTimer();
    };
  }, []);

  // Sync audio level from recorder state
  useEffect(() => {
    if (recorderState.isRecording) {
      const level = recorderState.metering != null
        ? normalizeDb(recorderState.metering)
        : 0;
      setAudioLevel(level);

      // Silence detection
      if (recorderState.metering != null && recorderState.metering < SILENCE_THRESHOLD_DB) {
        if (!silenceTimer.current) {
          silenceTimer.current = setTimeout(() => {
            if (stateRef.current === 'recording') stopRecording();
          }, SILENCE_DURATION_MS);
        }
      } else {
        _clearSilenceTimer();
      }
    }
  }, [recorderState]);

  const _clearSilenceTimer = () => {
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  };

  const startRecording = useCallback(async () => {
    if (stateRef.current !== 'idle') return;
    setError(null);
    setTranscript('');

    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setError('Microphone permission denied');
        return;
      }

      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();

      if (isMountedRef.current) setState('recording');
    } catch (err) {
      console.error('[VoiceInput] startRecording error:', err);
      setError('Failed to start recording');
      setState('idle');
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    if (stateRef.current !== 'recording') return;
    _clearSilenceTimer();

    if (isMountedRef.current) {
      setState('processing');
      setAudioLevel(0);
    }

    try {
      await recorder.stop();
      const uri = recorder.uri;

      if (!uri) {
        setState('idle');
        return;
      }

      let text = '';
      if (settings.sttProvider === 'whisper' && settings.whisperApiKey) {
        text = await transcribeAudio(uri, settings.whisperApiKey);
      }

      if (isMountedRef.current) {
        setTranscript(text);
        onTranscript?.(text);
        setState('idle');
      }
    } catch (err) {
      console.error('[VoiceInput] STT error:', err);
      if (isMountedRef.current) {
        setError('Speech recognition failed');
        setState('idle');
      }
    }
  }, [recorder, settings, onTranscript]);

  const cancelRecording = useCallback(async () => {
    _clearSilenceTimer();
    try {
      await recorder.stop();
    } catch {}
    if (isMountedRef.current) {
      setState('idle');
      setAudioLevel(0);
    }
  }, [recorder]);

  return {
    state,
    transcript,
    audioLevel,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
