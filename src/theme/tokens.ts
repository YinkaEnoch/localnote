export const darkColors = {
  surface: '#131315',
  'surface-dim': '#131315',
  'surface-bright': '#39393b',
  'surface-container-lowest': '#0e0e10',
  'surface-container-low': '#1c1b1d',
  'surface-container': '#201f22',
  'surface-container-high': '#2a2a2c',
  'surface-container-highest': '#353437',
  'on-surface': '#e5e1e4',
  'on-surface-variant': '#c7c4d7',
  'inverse-surface': '#e5e1e4',
  'inverse-on-surface': '#313032',
  outline: '#908fa0',
  'outline-variant': '#464554',
  'surface-tint': '#c0c1ff',
  primary: '#c0c1ff',
  'on-primary': '#1000a9',
  'primary-container': '#8083ff',
  'on-primary-container': '#0d0096',
  'inverse-primary': '#494bd6',
  secondary: '#4fdbc8',
  'on-secondary': '#003731',
  'secondary-container': '#04b4a2',
  'on-secondary-container': '#003f38',
  tertiary: '#ffb783',
  'on-tertiary': '#4f2500',
  'tertiary-container': '#d97721',
  'on-tertiary-container': '#452000',
  error: '#ffb4ab',
  'on-error': '#690005',
  'error-container': '#93000a',
  'on-error-container': '#ffdad6',
  background: '#131315',
  'on-background': '#e5e1e4'
};

export const lightColors = {
  surface: '#fdf8fd',
  'surface-dim': '#ded8dd',
  'surface-bright': '#fdf8fd',
  'surface-container-lowest': '#ffffff',
  'surface-container-low': '#f7f2f7',
  'surface-container': '#f1edf1',
  'surface-container-high': '#ebe7ec',
  'surface-container-highest': '#e5e1e6',
  'on-surface': '#1a1b1f',
  'on-surface-variant': '#46464f',
  'inverse-surface': '#313033',
  'inverse-on-surface': '#f4f0f4',
  outline: '#767680',
  'outline-variant': '#c7c5d0',
  'surface-tint': '#494bd6',
  primary: '#494bd6',
  'on-primary': '#ffffff',
  'primary-container': '#e0e0ff',
  'on-primary-container': '#00006e',
  'inverse-primary': '#c0c1ff',
  secondary: '#006a60',
  'on-secondary': '#ffffff',
  'secondary-container': '#74f8e5',
  'on-secondary-container': '#00201c',
  tertiary: '#8c4f00',
  'on-tertiary': '#ffffff',
  'tertiary-container': '#ffdcbe',
  'on-tertiary-container': '#2c1600',
  error: '#ba1a1a',
  'on-error': '#ffffff',
  'error-container': '#ffdad6',
  'on-error-container': '#410002',
  background: '#fdf8fd',
  'on-background': '#1a1b1f'
};

export type NoteColor = 'default' | 'crimson' | 'forest' | 'indigo' | 'slate';

export const noteCategoryColorsDark: Record<NoteColor, string> = {
  default: 'transparent',
  crimson: '#451A1A',
  forest: '#14532D',
  indigo: '#1E1B4B',
  slate: '#3F3F46'
};

export const noteCategoryColorsLight: Record<NoteColor, string> = {
  default: 'transparent',
  crimson: '#FFE4E6',
  forest: '#DCFCE7',
  indigo: '#E0F2FE',
  slate: '#F4F4F5'
};

export const folderPaletteDark = {
  indigo: '#c0c1ff',
  coral: '#ffb4ab',
  amber: '#ffb783',
  teal: '#4fdbc8',
  lavender: '#c7c4d7',
  blue: '#8083ff'
};

export const folderPaletteLight = {
  indigo: '#494bd6',
  coral: '#ba1a1a',
  amber: '#8c4f00',
  teal: '#006a60',
  lavender: '#46464f',
  blue: '#0d0096'
};

export const typography = {
  'display-lg': { fontFamily: 'Inter', fontSize: '36px', lineHeight: '44px', fontWeight: 700, letterSpacing: '-0.02em' },
  'display-lg-mobile': { fontFamily: 'Inter', fontSize: '28px', lineHeight: '34px', fontWeight: 700, letterSpacing: '-0.01em' },
  'headline-md': { fontFamily: 'Inter', fontSize: '24px', lineHeight: '32px', fontWeight: 600, letterSpacing: '-0.01em' },
  'body-lg': { fontFamily: 'Inter', fontSize: '18px', lineHeight: '28px', fontWeight: 400, letterSpacing: '0' },
  'body-md': { fontFamily: 'Inter', fontSize: '16px', lineHeight: '24px', fontWeight: 400, letterSpacing: '0' },
  'label-sm': { fontFamily: 'Inter', fontSize: '13px', lineHeight: '18px', fontWeight: 500, letterSpacing: '0.02em' },
  'mono-code': { fontFamily: '"JetBrains Mono"', fontSize: '14px', lineHeight: '20px', fontWeight: 400, letterSpacing: '0' }
};

export const spacing = {
  unit: '4px',
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '40px',
  xxl: '64px',
  gutter: '16px',
  'margin-mobile': '16px',
  'margin-desktop': '32px'
};

export const borderRadius = {
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  full: '9999px'
};
