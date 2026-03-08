import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import {
  LightbulbIcon, LightOffIcon, LockIcon, UnlockIcon,
  ThermometerIcon, AlertIcon, HomeIcon, CameraIcon,
  FanIcon, CheckIcon,
} from '../Icons';

interface HomeCardProps {
  content: string;
  metadata?: Record<string, unknown>;
}

interface HomeAction {
  icon: React.ReactElement;
  label: string;
  device: string;
  color: string;
}

function detectHomeAction(text: string, meta?: Record<string, unknown>): HomeAction {
  const lower = text.toLowerCase();
  const device = (meta?.device as string) ?? '';

  if (/light|lamp|bulb/.test(lower)) {
    const isOn = /turn on|lights on|on/.test(lower) && !/off/.test(lower);
    return { icon: isOn ? <LightbulbIcon size={30} color="#f5a623" /> : <LightOffIcon size={30} color="#555" />, label: isOn ? 'Lights On' : 'Lights Off', device: device || 'Lights', color: isOn ? '#f5a623' : '#555' };
  }
  if (/lock|door/.test(lower)) {
    const isLocked = /lock/.test(lower) && !/unlock/.test(lower);
    return { icon: isLocked ? <LockIcon size={30} /> : <UnlockIcon size={30} />, label: isLocked ? 'Door Locked' : 'Door Unlocked', device: device || 'Front Door', color: isLocked ? Colors.success : Colors.pink };
  }
  if (/thermo|temperature|heat|cool/.test(lower)) {
    const temp = text.match(/(\d+)\s*(?:°|degrees?|C|F)/)?.[1];
    return { icon: <ThermometerIcon size={30} />, label: temp ? `Set to ${temp}°` : 'Thermostat', device: device || 'Thermostat', color: Colors.accent };
  }
  if (/alarm|security/.test(lower)) {
    return { icon: <AlertIcon size={30} color={Colors.pink} />, label: 'Security', device: device || 'Alarm', color: Colors.pink };
  }
  if (/scene|movie|good morning|good night|away|arrive/.test(lower)) {
    return { icon: <HomeIcon size={30} />, label: 'Scene Activated', device: device || 'Home', color: Colors.accent2 };
  }
  if (/camera/.test(lower)) {
    return { icon: <CameraIcon size={30} />, label: 'Camera', device: device || 'Camera', color: Colors.accent };
  }
  if (/fan/.test(lower)) {
    return { icon: <FanIcon size={30} />, label: 'Fan', device: device || 'Fan', color: Colors.accent };
  }
  return { icon: <HomeIcon size={30} />, label: 'Home', device: device || 'HomeKit', color: Colors.accent };
}

export function HomeCard({ content, metadata }: HomeCardProps) {
  const translateY = useSharedValue(200);
  const opacity    = useSharedValue(0);
  const scale      = useSharedValue(0.85);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    opacity.value    = withTiming(1, { duration: 300 });
    scale.value      = withSequence(withSpring(1.08, { damping: 8 }), withSpring(1, { damping: 12 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const action = detectHomeAction(content, metadata);

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={[styles.iconCircle, { backgroundColor: `${action.color}22` }]}>
        <View style={styles.icon}>{action.icon}</View>
      </View>
      <View style={styles.info}>
        <Text style={styles.label}>Home</Text>
        <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
        <Text style={styles.device}>{action.device}</Text>
      </View>
      <View style={[styles.checkBadge, { backgroundColor: action.color }]}>
        <CheckIcon size={16} color="#fff" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,106,244,0.25)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 30, height: 30, alignItems: 'center' as const, justifyContent: 'center' as const },
  info: { flex: 1 },
  label: {
    fontFamily: 'Syne_500Medium',
    fontSize: 11,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  actionLabel: {
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
    marginBottom: 2,
  },
  device: {
    fontFamily: 'Syne_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  checkBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
