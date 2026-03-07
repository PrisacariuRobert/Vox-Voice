import { WHISPER_API_URL } from '../constants/config';

export async function transcribeAudio(audioUri: string, apiKey: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'audio.m4a',
  } as unknown as Blob);
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

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

  const { text } = await response.json();
  return (text as string).trim();
}
