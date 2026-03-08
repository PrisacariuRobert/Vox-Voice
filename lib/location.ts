// Lazy-load native module — crashes if not compiled into the dev client binary
let Location: typeof import('expo-location') | null = null;
try { Location = require('expo-location'); } catch { /* needs rebuild */ }

export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  formattedAddress?: string;
}

let cachedLocation: UserLocation | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function requestLocationPermission(): Promise<boolean> {
  if (!Location) return false;
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<UserLocation | null> {
  if (!Location) return null;

  // Return cached if fresh
  if (cachedLocation && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedLocation;
  }

  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      const granted = await requestLocationPermission();
      if (!granted) return cachedLocation;
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const result: UserLocation = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };

    // Reverse geocode to get city name
    try {
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      if (geo) {
        result.city = geo.city ?? undefined;
        result.region = geo.region ?? undefined;
        result.country = geo.country ?? undefined;
        result.formattedAddress = [geo.city, geo.country].filter(Boolean).join(', ');
      }
    } catch {
      // Geocode can fail offline — GPS coords are still valid
    }

    cachedLocation = result;
    cacheTimestamp = Date.now();
    return result;
  } catch {
    return cachedLocation;
  }
}

/** Clear cached location (e.g. when user toggles GPS off) */
export function clearLocationCache(): void {
  cachedLocation = null;
  cacheTimestamp = 0;
}
