import { WHISPER_API_URL } from '../constants/config';

export interface TranscriptionResult {
  text: string;
  language?: string;
}

export async function transcribeAudio(audioUri: string, apiKey: string): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'audio.m4a',
  } as unknown as Blob);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('language', 'en'); // Default to English to prevent false detection

  const response = await fetch(WHISPER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Whisper STT error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return {
    text: (data.text as string).trim(),
    language: data.language as string | undefined,
  };
}
