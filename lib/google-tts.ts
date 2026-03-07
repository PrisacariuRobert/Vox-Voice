import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { stripMarkdown } from './kokoro-tts';

export async function googleSpeak(
  text: string,
  apiKey: string,
  languageCode = 'en-US',
  voiceName = 'en-US-Journey-F'
): Promise<AudioPlayer> {
  const cleaned = stripMarkdown(text);

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: cleaned },
        voice: { languageCode, name: voiceName },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 1.05 },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Google TTS error: ${response.status}`);
  }

  const { audioContent } = await response.json();
  const uri = `data:audio/mp3;base64,${audioContent}`;
  return createAudioPlayer({ uri });
}
