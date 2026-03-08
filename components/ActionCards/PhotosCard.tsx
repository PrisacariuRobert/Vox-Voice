import { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '../../constants/colors';
import { PhotoQuery } from '../../types';
import { searchPhotosWithVision } from '../../lib/vision-photo-search';
import { loadSettings } from '../../app/(tabs)/settings';

// Lazy-load native modules — crash if not compiled into the dev client binary
let MediaLibrary: typeof import('expo-media-library') | null = null;
try { MediaLibrary = require('expo-media-library'); } catch { /* needs rebuild */ }

interface Props {
  content: string;
  query: PhotoQuery;
}

export function PhotosCard({ content, query }: Props) {
  const [photos, setPhotos] = useState<{ id: string; uri: string }[]>([]);
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied' | 'unavailable'>(
    MediaLibrary ? 'unknown' : 'unavailable'
  );
  const [scanning, setScanning] = useState(false);
  const [verified, setVerified] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [searchMethod, setSearchMethod] = useState<string>('');
  const [scanPhase, setScanPhase] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!MediaLibrary) return;
    MediaLibrary.getPermissionsAsync().then((perm) => {
      if (perm.granted) { setPermission('granted'); loadPhotos(); }
      else { setPermission('denied'); }
    });
  }, []);

  const requestPermission = async () => {
    if (!MediaLibrary) return;
    const perm = await MediaLibrary.requestPermissionsAsync();
    if (perm.granted) { setPermission('granted'); loadPhotos(); }
    else { setPermission('denied'); }
  };

  const loadPhotos = async () => {
    if (!MediaLibrary) return;
    setScanning(true);
    setVerified(false);
    try {
      const searchName = (query.personName ?? '').toLowerCase();

      // ── LATEST / no query: just fetch most recent ──────────────────────
      if (query.searchType === 'latest' || (!searchName && !query.from)) {
        const { assets } = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.photo,
          createdAfter: query.from,
          createdBefore: query.to,
          first: query.limit ?? 20,
          sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        });
        setPhotos(assets.map((a) => ({ id: a.id, uri: a.uri })));
        setSearchMethod('latest');
        setVerified(true);
        return;
      }

      // ── Date-range only (no search name) ───────────────────────────────
      if (!searchName && query.from) {
        const { assets } = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.photo,
          createdAfter: query.from,
          createdBefore: query.to,
          first: query.limit ?? 20,
          sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        });
        setPhotos(assets.map((a) => ({ id: a.id, uri: a.uri })));
        setSearchMethod('date range');
        setVerified(true);
        return;
      }

      // ── VISION SEARCH: YOLO → OpenAI verification ─────────────────────
      if (searchName) {
        setScanPhase('Starting scan...');
        setPhotos([]);
        const settings = await loadSettings();
        const result = await searchPhotosWithVision(
          query.personName ?? '',
          settings.whisperApiKey,
          query.limit ?? 20,
          settings.gatewayUrl,
          {
            onProgress: (scanned, total) => {
              setScanPhase(`Scanning ${scanned.toLocaleString()} / ${total.toLocaleString()}`);
            },
            onMatch: (photo) => {
              // Each verified photo appears IMMEDIATELY
              setPhotos((prev) => {
                if (prev.some((p) => p.id === photo.id)) return prev;
                return [...prev, photo];
              });
              setVerified(true);
            },
          },
        );

        // Final result
        if (result.photos.length > 0) {
          setPhotos(result.photos);
          setVerified(true);
          setSearchMethod(
            `${result.provider ?? 'AI'} · scanned ${(result.scanned ?? 0).toLocaleString()}`
          );
          return;
        }

        if (photos.length === 0) {
          setPhotos([]);
          setVerified(true);
          setSearchMethod(result.error ?? `Not found (scanned ${(result.scanned ?? 0).toLocaleString()})`);
        } else {
          // We already have streamed photos, just set final method
          setVerified(true);
          setSearchMethod(`${result.provider ?? 'AI'} · scanned ${(result.scanned ?? 0).toLocaleString()}`);
        }
        return;
      }
    } catch { /* silently fail */ }
    finally { setScanning(false); setScanPhase(''); }
  };

  if (permission === 'unavailable') {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Photos</Text>
        {content ? <Text style={styles.subtitle}>{content}</Text> : null}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            Photo access needs a one-time rebuild.{'\n'}
            Run: <Text style={styles.noteCode}>npx expo run:ios</Text>
          </Text>
        </View>
      </View>
    );
  }
  if (permission === 'denied') {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Photos</Text>
        {content ? <Text style={styles.subtitle}>{content}</Text> : null}
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Allow Photo Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Remove photos that failed to load
  const handleImageError = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const isInitialLoading = (scanning || permission === 'unknown') && photos.length === 0;
  const isStreamingResults = scanning && photos.length > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Photos</Text>
      {content ? <Text style={styles.subtitle}>{content}</Text> : null}

      {/* Initial loading — no results yet */}
      {isInitialLoading ? (
        <View>
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 12 }} />
          {scanPhase ? (
            <Text style={styles.searchStatus}>{scanPhase}...</Text>
          ) : null}
        </View>

      /* No photos found after scan completed */
      ) : !scanning && photos.length === 0 ? (
        <Text style={styles.empty}>
          {searchMethod && searchMethod !== 'not found'
            ? `No photos found. ${searchMethod}`
            : query.personName
              ? `No photos found matching "${query.personName}".`
              : 'No photos found for this period.'}
        </Text>

      /* Photos to display (streaming or final) */
      ) : (
        <>
          {/* Scanning / verifying banner */}
          {isStreamingResults ? (
            <View style={styles.scanBanner}>
              <ActivityIndicator color={Colors.accent} size="small" />
              <Text style={styles.scanBannerText}>
                {scanPhase.includes('Verifying')
                  ? `Verifying... ${photos.length} confirmed`
                  : `${scanPhase} · ${photos.length} found`
                }
              </Text>
            </View>
          ) : (
            <Text style={styles.count}>
              {photos.length} photo{photos.length !== 1 ? 's' : ''}
              {searchMethod ? ` · ${searchMethod}` : ''}
            </Text>
          )}

          {/* Single photo — hero mode */}
          {photos.length === 1 && !scanning ? (
            <Image source={{ uri: photos[0].uri }} style={styles.heroImg} contentFit="cover" onError={() => handleImageError(photos[0].id)} />
          ) : (
            /* Multiple photos — horizontal scroll */
            <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
              {photos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  onPress={() => setSelected(selected === photo.id ? null : photo.id)}
                  style={[styles.thumb, selected === photo.id && styles.thumbSelected]}
                >
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.thumbImg}
                    onError={() => handleImageError(photo.id)}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Full-size preview of selected photo */}
          {selected && photos.find((p) => p.id === selected) ? (
            <Image source={{ uri: photos.find((p) => p.id === selected)!.uri }} style={styles.fullImg} contentFit="cover" onError={() => handleImageError(selected)} />
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.surfaceBorder },
  title: { fontFamily: 'Syne_700Bold', fontSize: 16, color: Colors.text, marginBottom: 4 },
  subtitle: { fontFamily: 'Syne_400Regular', fontSize: 13, color: Colors.textSecondary, marginBottom: 10, lineHeight: 18 },
  count: { fontFamily: 'Syne_500Medium', fontSize: 12, color: Colors.textTertiary, marginBottom: 8 },
  scroll: { marginHorizontal: -4 },
  thumb: { marginHorizontal: 4, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  thumbSelected: { borderColor: Colors.accent },
  thumbImg: { width: 80, height: 80 },
  heroImg: { width: '100%', height: 260, borderRadius: 12, marginTop: 8 },
  fullImg: { width: '100%', height: 220, borderRadius: 12, marginTop: 12 },
  searchStatus: { fontFamily: 'Syne_400Regular', fontSize: 11, color: Colors.textTertiary, textAlign: 'center', marginTop: 6 },
  scanBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: 8, padding: 8, marginBottom: 8, gap: 8 },
  scanBannerText: { fontFamily: 'Syne_500Medium', fontSize: 12, color: Colors.accent, flex: 1 },
  empty: { fontFamily: 'Syne_400Regular', fontSize: 13, color: Colors.textTertiary, marginTop: 8 },
  permBtn: { marginTop: 12, backgroundColor: Colors.accent, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  permBtnText: { fontFamily: 'Syne_600SemiBold', fontSize: 14, color: '#fff' },
  noteBox: { marginTop: 10, backgroundColor: Colors.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.surfaceBorder },
  noteText: { fontFamily: 'Syne_400Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  noteCode: { fontFamily: 'Syne_500Medium', color: Colors.accent },
});
