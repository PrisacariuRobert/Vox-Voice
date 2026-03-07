import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/colors';
import { PhotoQuery } from '../../types';

// Lazy-load native module — crashes if not compiled into the dev client binary
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
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

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
    setLoading(true);
    try {
      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        createdAfter: query.from,
        createdBefore: query.to,
        first: query.limit ?? 20,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });
      setPhotos(assets.map((a) => ({ id: a.id, uri: a.uri })));
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  };

  if (permission === 'unavailable') {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>📷 Photos</Text>
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
        <Text style={styles.title}>📷 Photos</Text>
        {content ? <Text style={styles.subtitle}>{content}</Text> : null}
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Allow Photo Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>📷 Photos</Text>
      {content ? <Text style={styles.subtitle}>{content}</Text> : null}
      {loading || permission === 'unknown' ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 12 }} />
      ) : photos.length === 0 ? (
        <Text style={styles.empty}>No photos found for this period.</Text>
      ) : (
        <>
          <Text style={styles.count}>{photos.length} photo{photos.length !== 1 ? 's' : ''}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
            {photos.map((photo) => (
              <TouchableOpacity
                key={photo.id}
                onPress={() => setSelected(selected === photo.id ? null : photo.id)}
                style={[styles.thumb, selected === photo.id && styles.thumbSelected]}
              >
                <Image source={{ uri: photo.uri }} style={styles.thumbImg} />
              </TouchableOpacity>
            ))}
          </ScrollView>
          {selected && photos.find((p) => p.id === selected) ? (
            <Image source={{ uri: photos.find((p) => p.id === selected)!.uri }} style={styles.fullImg} resizeMode="cover" />
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
  fullImg: { width: '100%', height: 220, borderRadius: 12, marginTop: 12 },
  empty: { fontFamily: 'Syne_400Regular', fontSize: 13, color: Colors.textTertiary, marginTop: 8 },
  permBtn: { marginTop: 12, backgroundColor: Colors.accent, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  permBtnText: { fontFamily: 'Syne_600SemiBold', fontSize: 14, color: '#fff' },
  noteBox: { marginTop: 10, backgroundColor: Colors.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.surfaceBorder },
  noteText: { fontFamily: 'Syne_400Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  noteCode: { fontFamily: 'Syne_500Medium', color: Colors.accent },
});
