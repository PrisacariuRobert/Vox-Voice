import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { stripMarkdown } from './kokoro-tts';

export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer';

export async function openAiSpeak(
  text: string,
  apiKey: string,
  voice: OpenAIVoice = 'nova'
): Promise<AudioPlayer> {
  const cleaned = stripMarkdown(text);

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: cleaned,
      voice,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI TTS error: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const uri = `data:audio/mp3;base64,${base64}`;

  return createAudioPlayer({ uri });
}
