import React from 'react';
import Svg, { Path, Circle, Line, Polyline, Rect, G, Polygon } from 'react-native-svg';

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// ─── Tab bar icons ───────────────────────────────────────────────────────────

export function MicIcon({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="1" width="6" height="12" rx="3" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M5 10a7 7 0 0 0 14 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="12" y1="17" x2="12" y2="21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="8" y1="21" x2="16" y2="21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function ClockIcon({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} />
      <Polyline points="12,6 12,12 16,14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function GearIcon({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

// ─── Weather icons ───────────────────────────────────────────────────────────

export function SunIcon({ size = 24, color = '#F5A623', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="12" y1="1" x2="12" y2="3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="12" y1="21" x2="12" y2="23" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="1" y1="12" x2="3" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="21" y1="12" x2="23" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function CloudIcon({ size = 24, color = '#8E8E93', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Svg>
  );
}

export function CloudSunIcon({ size = 24, color = '#F5A623', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2v2M4.93 4.93l1.41 1.41M2 12h2M4.93 19.07l1.41-1.41" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx="10" cy="10" r="4" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M18 13h-1.26A6 6 0 0 0 8.4 16H18a3 3 0 1 0 0-6v3z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Svg>
  );
}

export function CloudRainIcon({ size = 24, color = '#007AFF', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Line x1="8" y1="19" x2="8" y2="21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="12" y1="19" x2="12" y2="21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="16" y1="19" x2="16" y2="21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function SnowflakeIcon({ size = 24, color = '#5AC8FA', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="2" x2="12" y2="22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="19.07" y1="4.93" x2="4.93" y2="19.07" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function ThunderstormIcon({ size = 24, color = '#FF9500', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Polyline points="13,16 11,20 15,20 13,24" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function FogIcon({ size = 24, color = '#8E8E93', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="3" y1="8" x2="21" y2="8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="3" y1="16" x2="21" y2="16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="7" y1="20" x2="17" y2="20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function WindIcon({ size = 24, color = '#5AC8FA', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9.59 4.59A2 2 0 1 1 11 8H2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12.59 19.41A2 2 0 1 0 14 16H2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17.73 7.73A2.5 2.5 0 1 1 19.5 12H2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function DropletIcon({ size = 24, color = '#5AC8FA', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

// ─── Home icons ──────────────────────────────────────────────────────────────

export function LightbulbIcon({ size = 24, color = '#F5A623', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18h6M10 22h4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A7 7 0 1 0 7.5 11.5c.76.76 1.23 1.52 1.41 2.5" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function LightOffIcon({ size = 24, color = '#555', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18h6M10 22h4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A7 7 0 1 0 7.5 11.5c.76.76 1.23 1.52 1.41 2.5" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="2" y1="2" x2="22" y2="22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function LockIcon({ size = 24, color = '#34C759', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function UnlockIcon({ size = 24, color = '#FF2D55', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M7 11V7a5 5 0 0 1 9.9-1" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function ThermometerIcon({ size = 24, color = '#007AFF', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function AlertIcon({ size = 24, color = '#FF2D55', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx="12" cy="17" r="0.5" fill={color} stroke={color} strokeWidth="1" />
    </Svg>
  );
}

export function HomeIcon({ size = 24, color = '#5856D6', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={color} strokeWidth={strokeWidth} />
      <Polyline points="9,22 9,12 15,12 15,22" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function CameraIcon({ size = 24, color = '#007AFF', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function FanIcon({ size = 24, color = '#007AFF', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 12c-3-5-8-3-8 0s5 3 8 0z" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M12 12c5-3 3-8 0-8s-3 5 0 8z" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M12 12c3 5 8 3 8 0s-5-3-8 0z" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M12 12c-5 3-3 8 0 8s3-5 0-8z" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
    </Svg>
  );
}

// ─── System control icons ────────────────────────────────────────────────────

export function MoonIcon({ size = 24, color = '#5856D6', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function VolumeIcon({ size = 24, color = '#007AFF', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="11,5 6,9 2,9 2,15 6,15 11,19" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function TargetIcon({ size = 24, color = '#FF2D55', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="12" cy="12" r="6" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="12" cy="12" r="2" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function BatteryIcon({ size = 24, color = '#34C759', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="1" y="6" width="18" height="12" rx="2" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="23" y1="10" x2="23" y2="14" stroke={color} strokeWidth={strokeWidth + 1} strokeLinecap="round" />
      <Rect x="3" y="8" width="8" height="8" rx="1" fill={color} />
    </Svg>
  );
}

export function WifiIcon({ size = 24, color = '#007AFF', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M1.42 9a16.06 16.06 0 0 1 21.16 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M5 12.55a11 11 0 0 1 14.08 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx="12" cy="20" r="1" fill={color} />
    </Svg>
  );
}

// ─── Action card icons ───────────────────────────────────────────────────────

export function CalendarIcon({ size = 24, color = '#007AFF', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function MailIcon({ size = 24, color = '#34C759', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={color} strokeWidth={strokeWidth} />
      <Polyline points="22,6 12,13 2,6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SendIcon({ size = 24, color = '#34C759', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="22" y1="2" x2="11" y2="13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Polygon points="22,2 15,22 11,13 2,9" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Svg>
  );
}

export function InboxIcon({ size = 24, color = '#34C759', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="22,12 16,12 14,15 10,15 8,12 2,12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function ChatIcon({ size = 24, color = '#8E8E93', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function MusicNoteIcon({ size = 24, color = '#fa243c', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18V5l12-2v13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="6" cy="18" r="3" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="18" cy="16" r="3" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function MicrophoneIcon({ size = 24, color = '#007AFF', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="12" y1="19" x2="12" y2="23" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="8" y1="23" x2="16" y2="23" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function NoteIcon({ size = 24, color = '#FF9500', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth={strokeWidth} />
      <Polyline points="14,2 14,8 20,8" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="16" y1="13" x2="8" y2="13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="16" y1="17" x2="8" y2="17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function PhoneIcon({ size = 24, color = '#34C759', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.61.68 2.38a2 2 0 0 1-.45 2.11L8.09 9.45a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.77.32 1.57.55 2.38.68A2 2 0 0 1 22 16.92z" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function UserIcon({ size = 24, color = '#5856D6', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function AlarmClockIcon({ size = 24, color = '#FF9500', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="13" r="8" stroke={color} strokeWidth={strokeWidth} />
      <Polyline points="12,9 12,13 15,14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="5" y1="3" x2="2" y2="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="19" y1="3" x2="22" y2="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function NewspaperIcon({ size = 24, color = '#1C1C1E', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="6" y1="8" x2="18" y2="8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="6" y1="12" x2="14" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="6" y1="16" x2="11" y2="16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function ChartIcon({ size = 24, color = '#34C759', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="22,12 18,8 13,14 9,10 2,17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="22,6 22,12 16,12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function MapPinIcon({ size = 24, color = '#FF3B30', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function MapIcon({ size = 24, color = '#34C759', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Line x1="8" y1="2" x2="8" y2="18" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="16" y1="6" x2="16" y2="22" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function StopwatchIcon({ size = 24, color = '#FF9500', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="14" r="8" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="12" y1="10" x2="12" y2="14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="12" y1="14" x2="14.5" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="10" y1="2" x2="14" y2="2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="12" y1="2" x2="12" y2="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function SmartphoneIcon({ size = 24, color = '#8E8E93', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="2" width="14" height="20" rx="2" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="12" y1="18" x2="12" y2="18.01" stroke={color} strokeWidth={strokeWidth + 1} strokeLinecap="round" />
    </Svg>
  );
}

export function CheckIcon({ size = 24, color = '#fff', strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="4,12 10,18 20,6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Lookup by name ──────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.FC<IconProps>> = {
  mic: MicIcon,
  clock: ClockIcon,
  gear: GearIcon,
  sun: SunIcon,
  cloud: CloudIcon,
  'cloud-sun': CloudSunIcon,
  'cloud-rain': CloudRainIcon,
  snowflake: SnowflakeIcon,
  thunderstorm: ThunderstormIcon,
  fog: FogIcon,
  wind: WindIcon,
  droplet: DropletIcon,
  lightbulb: LightbulbIcon,
  'light-off': LightOffIcon,
  lock: LockIcon,
  unlock: UnlockIcon,
  thermometer: ThermometerIcon,
  alert: AlertIcon,
  home: HomeIcon,
  camera: CameraIcon,
  fan: FanIcon,
  moon: MoonIcon,
  volume: VolumeIcon,
  target: TargetIcon,
  battery: BatteryIcon,
  wifi: WifiIcon,
  calendar: CalendarIcon,
  mail: MailIcon,
  send: SendIcon,
  inbox: InboxIcon,
  chat: ChatIcon,
  'music-note': MusicNoteIcon,
  microphone: MicrophoneIcon,
  note: NoteIcon,
  phone: PhoneIcon,
  user: UserIcon,
  'alarm-clock': AlarmClockIcon,
  newspaper: NewspaperIcon,
  chart: ChartIcon,
  'map-pin': MapPinIcon,
  map: MapIcon,
  stopwatch: StopwatchIcon,
  smartphone: SmartphoneIcon,
  check: CheckIcon,
};

export function Icon({ name, ...props }: IconProps & { name: string }) {
  const Component = ICON_MAP[name];
  if (!Component) return null;
  return <Component {...props} />;
}
