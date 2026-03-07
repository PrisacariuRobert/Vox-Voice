import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { NowPlayingData } from '../../types';

interface NowPlayingCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

function MusicBars({ color }: { color: string }) {
  const h1 = useSharedValue(4);
  const h2 = useSharedValue(4);
  const h3 = useSharedValue(4);

  useEffect(() => {
    h1.value = withRepeat(withSequence(withTiming(20, { duration: 400 }), withTiming(6, { duration: 400 })), -1, true);
    h2.value = withRepeat(withSequence(withTiming(28, { duration: 300 }), withTiming(8, { duration: 300 })), -1, true);
    h3.value = withRepeat(withSequence(withTiming(14, { duration: 500 }), withTiming(4, { duration: 500 })), -1, true);
  }, []);

  const s1 = useAnimatedStyle(() => ({ height: h1.value }));
  const s2 = useAnimatedStyle(() => ({ height: h2.value }));
  const s3 = useAnimatedStyle(() => ({ height: h3.value }));

  return (
    <View style={bars.container}>
      <Animated.View style={[bars.bar, { backgroundColor: color }, s1]} />
      <Animated.View style={[bars.bar, { backgroundColor: color }, s2]} />
      <Animated.View style={[bars.bar, { backgroundColor: color }, s3]} />
    </View>
  );
}

export function NowPlayingCard({ content, metadata }: NowPlayingCardProps) {
  const translateY = useSharedValue(200);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    opacity.value = withTiming(1, { duration: 300 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const np = metadata?.nowPlaying as NowPlayingData | undefined;
  const source = (np?.source ?? extractSource(content)).toLowerCase();
  const isPodcasts = source.includes('podcast');

  // Source-specific theming — Apple Music (red) or Podcasts (accent blue)
  const accentColor = isPodcasts ? Colors.accent : '#fa243c';
  const accentDim   = isPodcasts ? Colors.accentDim : 'rgba(250,36,60,0.25)';
  const badgeLabel  = isPodcasts ? '🎙 Podcasts' : '♪ Apple Music';
  const artIcon     = isPodcasts ? '🎙' : '🎵';

  const title  = np?.title  ?? extractFromContent(content, 'title');
  const artist = np?.artist ?? extractFromContent(content, 'artist');
  const album  = np?.album;

  return (
    <Animated.View style={[styles.card, { borderColor: accentDim }, animStyle]}>
      <View style={styles.artContainer}>
        <View style={[styles.art, { backgroundColor: `${accentColor}22` }]}>
          <Text style={styles.artIcon}>{artIcon}</Text>
        </View>
        <MusicBars color={accentColor} />
      </View>

      <View style={styles.info}>
        <View style={styles.header}>
          <Text style={[styles.label, { color: accentColor }]}>Now Playing</Text>
          <Text style={styles.sourceBadge}>{badgeLabel}</Text>
        </View>
        {title ? (
          <Text style={styles.trackTitle} numberOfLines={1}>{title}</Text>
        ) : (
          <Text style={styles.content} numberOfLines={2}>{content}</Text>
        )}
        {artist ? <Text style={styles.artist} numberOfLines={1}>{artist}</Text> : null}
        {album  ? <Text style={styles.album}  numberOfLines={1}>{album}</Text>  : null}
      </View>
    </Animated.View>
  );
}

function extractSource(text: string): string {
  if (/podcast/i.test(text)) return 'Podcasts';
  return 'Apple Music'; // default — user uses Apple Music only
}

function extractFromContent(text: string, field: 'title' | 'artist'): string | undefined {
  if (field === 'title') {
    const m = text.match(/["']([^"']+)["']\s+by/i)
           || text.match(/playing\s+["']?([^"'\n,]+?)["']?\s+by/i);
    return m?.[1];
  }
  const m = text.match(/by\s+([^\n,.]+)/i);
  return m?.[1];
}

const bars = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 30,
    marginLeft: 8,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
});

const styles = StyleSheet.create({
  card: {
    width: 300,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  artContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  art: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artIcon: { fontSize: 28 },
  info: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sourceBadge: {
    fontFamily: 'Syne_400Regular',
    fontSize: 11,
    color: Colors.textTertiary,
  },
  trackTitle: {
    fontFamily: 'Syne_700Bold',
    fontSize: 17,
    color: Colors.text,
    marginBottom: 2,
  },
  artist: {
    fontFamily: 'Syne_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  album: {
    fontFamily: 'Syne_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  content: {
    fontFamily: 'Syne_400Regular',
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
});
