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
    label: '새벽 아침 광장 🌅',
    bgStart: '#FFE5EC',
    bgEnd: '#F0D6FF',
    accent: '#FF85A2',
    accentGlow: 'rgba(255, 133, 162, 0.4)',
    gridColor: 'rgba(255, 133, 162, 0.06)'
  },
  afternoon: {
    name: 'afternoon',
    label: '따사로운 낮 광장 ☀️',
    bgStart: '#E0F2FE',
    bgEnd: '#DCFCE7',
    accent: '#10B981',
    accentGlow: 'rgba(16, 185, 129, 0.4)',
    gridColor: 'rgba(16, 185, 129, 0.06)'
  },
  evening: {
    name: 'evening',
    label: '노을 지는 저녁 광장 🌇',
    bgStart: '#FFE4E6',
    bgEnd: '#FEF3C7',
    accent: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.4)',
    gridColor: 'rgba(245, 158, 11, 0.06)'
  },
  night: {
    name: 'night',
    label: '별이 빛나는 밤 광장 🌌',
    bgStart: '#1E293B',
    bgEnd: '#0F172A',
    accent: '#FBBF24',
    accentGlow: 'rgba(251, 191, 36, 0.4)',
    gridColor: 'rgba(251, 191, 36, 0.08)'
  }
};

export const getThemeByHour = (hour: number): TimeTheme => {
  if (hour >= 5 && hour < 11) return THEMES.morning;
  if (hour >= 11 && hour < 17) return THEMES.afternoon;
  if (hour >= 17 && hour < 20) return THEMES.evening;
  return THEMES.night;
};
