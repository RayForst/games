import { Platform } from 'react-native';

// Тёмная «клубная» палитра: дерево, кожа, латунь, кровь.
export const colors = {
  bg: '#14100c',
  bgElevated: '#1d1711',
  card: '#241c15',
  cardAlt: '#2c231a',
  border: '#3d3023',
  borderStrong: '#5a4731',
  text: '#f0e6d2',
  textMuted: '#a79a84',
  textDim: '#6f6452',
  gold: '#d9a74a',
  goldDim: '#8b6b2b',
  red: '#c9453a',
  redDim: '#6e2a24',
  green: '#6fae5b',
  blue: '#5b8fc9',
  purple: '#a06cd5',
  black: '#000000',
  white: '#ffffff',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const fonts = {
  title: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  body: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
} as const;

export const outcomeColors = {
  hit: colors.text,
  crit: colors.gold,
  'crit-through-block': colors.gold,
  blocked: colors.textMuted,
  dodged: colors.blue,
} as const;
