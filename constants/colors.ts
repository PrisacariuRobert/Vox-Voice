export const Colors = {
  // Background
  bg: '#FFFFFF',
  bgSecondary: '#F2F2F7',

  // Surfaces — white cards with subtle shadow
  surface: '#FFFFFF',
  surfaceHover: '#F9F9FB',
  surfaceBorder: '#E5E5EA',

  // Accents — iOS system blue
  accent: '#007AFF',
  accentDim: 'rgba(0, 122, 255, 0.12)',
  accent2: '#5856D6',
  accent2Dim: 'rgba(88, 86, 214, 0.12)',

  // Semantic — iOS system colors
  success: '#34C759',
  successDim: 'rgba(52, 199, 89, 0.12)',
  pink: '#FF2D55',
  pinkDim: 'rgba(255, 45, 85, 0.12)',
  warning: '#FF9500',

  // Text — iOS label hierarchy
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',

  // Orb blob colors per state (iridescent layers)
  orbIdle: ['#C2EDD0', '#D4C8F8'] as const,
  orbWake: ['#A8D8F8', '#C8B8FF'] as const,
  orbRecording: ['#7DB8FF', '#4A8FFF'] as const,
  orbThinking: ['#C0ADFF', '#A08CF5'] as const,
  orbSpeaking: ['#7DE8A8', '#4DCF7A'] as const,
  orbDone: ['#FFB0C4', '#FF7A96'] as const,

  // Tab bar
  tabBar: 'rgba(255, 255, 255, 0.92)',
  tabBarBorder: '#E5E5EA',
  tabActive: '#007AFF',
  tabInactive: '#C7C7CC',
};
