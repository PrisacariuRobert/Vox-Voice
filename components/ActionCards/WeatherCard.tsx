import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { extractWeatherData } from '../../lib/card-parser';
import {
  SunIcon,
  CloudIcon,
  CloudSunIcon,
  CloudRainIcon,
  SnowflakeIcon,
  ThunderstormIcon,
  FogIcon,
  WindIcon,
  DropletIcon,
} from '../Icons';

interface WeatherCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

function getConditionIcon(condition?: string): React.ReactElement {
  if (!condition) return <CloudSunIcon size={36} />;
  const c = condition.toLowerCase();
  if (c.includes('sun') || c.includes('clear')) return <SunIcon size={36} />;
  if (c.includes('partly') || c.includes('partly cloudy')) return <CloudSunIcon size={36} />;
  if (c.includes('cloud')) return <CloudIcon size={36} />;
  if (c.includes('rain') || c.includes('shower')) return <CloudRainIcon size={36} />;
  if (c.includes('snow')) return <SnowflakeIcon size={36} />;
  if (c.includes('thunder') || c.includes('storm')) return <ThunderstormIcon size={36} />;
  if (c.includes('fog') || c.includes('mist')) return <FogIcon size={36} />;
  if (c.includes('wind')) return <WindIcon size={36} />;
  return <CloudSunIcon size={36} />;
}

function getGradientColor(condition?: string): string {
  if (!condition) return '#EEF4FF';
  const c = condition.toLowerCase();
  if (c.includes('sun') || c.includes('clear')) return '#FFF8EC';
  if (c.includes('rain') || c.includes('shower')) return '#EEF2FF';
  if (c.includes('snow')) return '#F0F6FF';
  if (c.includes('cloud')) return '#F5F5FA';
  return '#EEF4FF';
}

export function WeatherCard({ content, metadata }: WeatherCardProps) {
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

  const weather = extractWeatherData(content, metadata);
  const icon = getConditionIcon(weather.condition);
  const bgColor = getGradientColor(weather.condition);

  return (
    <Animated.View style={[styles.card, { backgroundColor: bgColor }, animStyle]}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.city}>{weather.city ?? 'Current Location'}</Text>
          <Text style={styles.condition}>{weather.condition ?? 'Checking...'}</Text>
        </View>
        <View style={styles.conditionIcon}>{icon}</View>
      </View>

      <Text style={styles.temp}>{weather.temp ?? '—'}</Text>

      <View style={styles.statsRow}>
        {weather.high && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>High</Text>
            <Text style={styles.statValue}>{weather.high}</Text>
          </View>
        )}
        {weather.low && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Low</Text>
            <Text style={styles.statValue}>{weather.low}</Text>
          </View>
        )}
        {weather.humidity && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Humidity</Text>
            <View style={styles.humidityValue}>
              <DropletIcon size={14} color={Colors.textSecondary} />
              <Text style={styles.statValue}> {weather.humidity}</Text>
            </View>
          </View>
        )}
      </View>

      {!weather.temp && (
        <Text style={styles.fallbackText}>{content}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  city: {
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 2,
  },
  condition: {
    fontFamily: 'Syne_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  conditionIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  temp: {
    fontFamily: 'Syne_800ExtraBold',
    fontSize: 52,
    color: Colors.text,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {},
  statLabel: {
    fontFamily: 'Syne_400Regular',
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  humidityValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fallbackText: {
    fontFamily: 'Syne_400Regular',
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
});
