export interface TimeTheme {
  name: string;
  label: string;
  bgStart: string;
  bgEnd: string;
  accent: string;
  accentGlow: string;
  gridColor: string;
}

export const THEMES: Record<string, TimeTheme> = {
  morning: {
    name: 'morning',
    label: '새벽 아침',
    bgStart: '#140c22',
    bgEnd: '#05020a',
    accent: '#FF9F1C',
    accentGlow: 'rgba(255, 159, 28, 0.4)',
    gridColor: 'rgba(255, 159, 28, 0.04)'
  },
  afternoon: {
    name: 'afternoon',
    label: '한낮 광장',
    bgStart: '#0a192f',
    bgEnd: '#020813',
    accent: '#39FF14',
    accentGlow: 'rgba(57, 255, 20, 0.4)',
    gridColor: 'rgba(57, 255, 20, 0.04)'
  },
  evening: {
    name: 'evening',
    label: '노을 저녁',
    bgStart: '#20081e',
    bgEnd: '#080208',
    accent: '#FF007F',
    accentGlow: 'rgba(255, 0, 127, 0.4)',
    gridColor: 'rgba(255, 0, 127, 0.04)'
  },
  night: {
    name: 'night',
    label: '심야 광장',
    bgStart: '#050c18',
    bgEnd: '#000000',
    accent: '#00F0FF',
    accentGlow: 'rgba(0, 240, 255, 0.4)',
    gridColor: 'rgba(0, 240, 255, 0.04)'
  }
};

export const getThemeByHour = (hour: number): TimeTheme => {
  if (hour >= 5 && hour < 11) return THEMES.morning;
  if (hour >= 11 && hour < 17) return THEMES.afternoon;
  if (hour >= 17 && hour < 20) return THEMES.evening;
  return THEMES.night;
};
