/**
 * Photo search — sends batches to the YOLO server which handles
 * both YOLO+CLIP scoring AND OpenAI verification in one call.
 * All logs are visible in the server terminal.
 *
 * Scans the entire photo library page by page.
 * Each page's confirmed matches stream to the UI immediately.
 *
 * Falls back to OpenAI-only from the app if server is unavailable.
 */

// Lazy-load native modules
let MediaLibrary: typeof import('expo-media-library') | null = null;
try { MediaLibrary = require('expo-media-library'); } catch { /* needs rebuild */ }

let ImageManipulator: typeof import('expo-image-manipulator') | null = null;
try { ImageManipulator = require('expo-image-manipulator'); } catch { /* needs rebuild */ }

export interface VisionSearchResult {
  photos: { id: string; uri: string }[];
  provider?: 'yolo+openai' | 'yolo' | 'openai';
  error?: string;
  scanned?: number;
}

export interface StreamCallbacks {
  onProgress?: (scanned: number, total: number) => void;
  onMatch?: (photo: { id: string; uri: string }) => void;
}

function getYoloUrl(gatewayUrl: string): string {
  const host = gatewayUrl.replace(/^wss?:\/\//, '').replace(/:\d+$/, '');
  return `http://${host}:18790`;
}

/** Create thumbnails from assets */
async function createThumbnailBatch(
  assets: Array<{ id: string; uri: string }>,
  width = 256,
): Promise<Array<{ base64: string; asset: { id: string; uri: string } }>> {
  if (!ImageManipulator) return [];
  const thumbnails: Array<{ base64: string; asset: { id: string; uri: string } }> = [];
  for (const asset of assets) {
    try {
      const thumb = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      if (thumb.base64) {
        thumbnails.push({ base64: thumb.base64, asset });
      }
    } catch { /* skip */ }
  }
  return thumbnails;
}

/**
 * Send a batch to the server — it does YOLO scoring + OpenAI verification.
 * Returns confirmed photo indices.
 */
async function searchBatchViaServer(
  query: string,
  thumbnails: Array<{ base64: string; asset: { id: string; uri: string } }>,
  serverUrl: string,
  limit: number,
): Promise<{ id: string; uri: string }[]> {
  const BATCH = 10;
  const matched: { id: string; uri: string }[] = [];

  for (let i = 0; i < thumbnails.length; i += BATCH) {
    if (matched.length >= limit) break;
    const batch = thumbnails.slice(i, i + BATCH);

    try {
      const res = await fetch(`${serverUrl}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          images: batch.map((t) => t.base64),
          top_k: limit - matched.length,
          verify: true,
        }),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const matches: number[] = data.matches ?? [];
      for (const idx of matches) {
        if (idx >= 0 && idx < batch.length) {
          matched.push({ id: batch[idx].asset.id, uri: batch[idx].asset.uri });
        }
      }
    } catch { /* batch failed */ }
  }

  return matched;
}

/**
 * Fallback: direct OpenAI search from the app (no YOLO server).
 */
async function searchBatchViaOpenAI(
  query: string,
  thumbnails: Array<{ base64: string; asset: { id: string; uri: string } }>,
  apiKey: string,
  limit: number,
): Promise<{ id: string; uri: string }[]> {
  if (!apiKey) return [];
  const matched: { id: string; uri: string }[] = [];
  const BATCH = 10;

  for (let i = 0; i < thumbnails.length; i += BATCH) {
    if (matched.length >= limit) break;
    const batch = thumbnails.slice(i, i + BATCH);

    const inputContent: Array<Record<string, unknown>> = [
      {
        type: 'input_text',
        text: `You are a photo search assistant. I will show you ${batch.length} photos numbered 1 to ${batch.length}.\n\nSearch for: "${query}"\n\nBe STRICT — only return photos that clearly match.\nReturn ONLY a JSON array of matching photo numbers. Example: [2, 5]\nIf NONE match: []\nNo explanation.`,
      },
    ];

    for (let j = 0; j < batch.length; j++) {
      inputContent.push({ type: 'input_text', text: `Photo ${j + 1}:` });
      inputContent.push({
        type: 'input_image',
        image_url: `data:image/jpeg;base64,${batch[j].base64}`,
      });
    }

    try {
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          input: [{ role: 'user', content: inputContent }],
        }),
      });

      if (!res.ok) break;
      const data = await res.json();
      const text = data.output_text ?? '[]';
      const arrayMatch = text.match(/\[[\d\s,]*\]/);
      if (arrayMatch) {
        const indices: number[] = JSON.parse(arrayMatch[0]);
        for (const num of indices) {
          const idx = num - 1;
          if (idx >= 0 && idx < batch.length) {
            matched.push({ id: batch[idx].asset.id, uri: batch[idx].asset.uri });
          }
        }
      }
    } catch { /* batch failed */ }
  }

  return matched.slice(0, limit);
}

/**
 * Main search — scans entire photo library, page by page.
 * Each page goes to the server (YOLO+OpenAI) and confirmed matches
 * stream to the UI immediately via onMatch callback.
 */
export async function searchPhotosWithVision(
  query: string,
  apiKey: string,
  limit = 20,
  gatewayUrl = '',
  stream?: StreamCallbacks,
): Promise<VisionSearchResult> {
  if (!MediaLibrary || !ImageManipulator) {
    return { photos: [], error: 'Native modules not available. Rebuild with: npx expo run:ios' };
  }

  // Check server availability
  let serverUrl = '';
  let useServer = false;
  if (gatewayUrl) {
    serverUrl = getYoloUrl(gatewayUrl);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2000);
      const health = await fetch(`${serverUrl}/health`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (health.ok) {
        const data = await health.json();
        useServer = true;
        // Check if server has OpenAI configured
        if (!data.openai && apiKey) {
          // Server doesn't have API key — we'll still use it but results won't be verified
        }
      }
    } catch { /* server not available */ }
  }

  if (!useServer && !apiKey) {
    return { photos: [], error: 'No YOLO server and no OpenAI API key.' };
  }

  try {
    const { totalCount } = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.photo,
      first: 1,
    });

    const PAGE_SIZE = 100;
    let scanned = 0;
    let cursor: string | undefined;
    let hasMore = true;
    const confirmed: { id: string; uri: string }[] = [];

    while (hasMore) {
      if (confirmed.length >= limit) break;

      const pageResult = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: PAGE_SIZE,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        ...(cursor ? { after: cursor } : {}),
      });

      if (pageResult.assets.length === 0) break;

      const thumbnails = await createThumbnailBatch(pageResult.assets);

      if (thumbnails.length > 0) {
        const remaining = limit - confirmed.length;
        let pageMatches: { id: string; uri: string }[];

        if (useServer) {
          pageMatches = await searchBatchViaServer(query, thumbnails, serverUrl, remaining);
        } else {
          pageMatches = await searchBatchViaOpenAI(query, thumbnails, apiKey, remaining);
        }

        // Stream each confirmed photo to UI immediately
        for (const photo of pageMatches) {
          confirmed.push(photo);
          stream?.onMatch?.(photo);
        }
      }

      scanned += pageResult.assets.length;
      stream?.onProgress?.(scanned, totalCount);

      hasMore = pageResult.hasNextPage;
      cursor = pageResult.endCursor;
    }

    return {
      photos: confirmed.slice(0, limit),
      provider: useServer ? 'yolo+openai' : 'openai',
      scanned,
    };
  } catch (e: unknown) {
    return { photos: [], error: e instanceof Error ? e.message : 'Vision search failed' };
  }
}
