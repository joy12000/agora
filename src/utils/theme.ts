export interface TimeTheme {
  name: string;
  label: string;
  bgStart: string;
  bgEnd: string;
  accent: string;
  accentGlow: string;
  gridColor: string;
  grassColor: string;
  pathColor: string;
}

export const THEMES: Record<string, TimeTheme> = {
  morning: {
    name: 'morning',
    label: '🌅 아침 안개 공원',
    bgStart: '#2c223c',
    bgEnd: '#171221',
    accent: '#ffb703',
    accentGlow: 'rgba(255, 183, 3, 0.3)',
    gridColor: 'rgba(255, 183, 3, 0.06)',
    grassColor: '#2f483a', // 아침의 어슴푸레한 초록
    pathColor: '#473d38'   // 어두운 흙길 톤
  },
  afternoon: {
    name: 'afternoon',
    label: '☀️ 햇살 푸른 광장',
    bgStart: '#1d3557',
    bgEnd: '#0f172a',
    accent: '#4ade80',
    accentGlow: 'rgba(74, 222, 128, 0.3)',
    gridColor: 'rgba(74, 222, 128, 0.06)',
    grassColor: '#386641', // 푸르른 햇살 아래 잔디
    pathColor: '#8b8c89'   // 밝은 회색 돌길
  },
  evening: {
    name: 'evening',
    label: '🌇 노을 지는 공원',
    bgStart: '#4a233b',
    bgEnd: '#220f1b',
    accent: '#ff7096',
    accentGlow: 'rgba(255, 112, 150, 0.3)',
    gridColor: 'rgba(255, 112, 150, 0.06)',
    grassColor: '#4c3b30', // 노을빛을 머금은 마른 잔디
    pathColor: '#5c4033'   // 따뜻한 황토빛 흙길
  },
  night: {
    name: 'night',
    label: '🌌 별빛 심야 광장',
    bgStart: '#0f172a',
    bgEnd: '#020617',
    accent: '#fbbf24',
    accentGlow: 'rgba(251, 191, 36, 0.4)',
    gridColor: 'rgba(251, 191, 36, 0.06)',
    grassColor: '#132a13', // 밤의 짙은 어두운 잔디
    pathColor: '#25282a'   // 어두운 아스팔트/돌바닥
  }
};

export const getThemeByHour = (hour: number): TimeTheme => {
  if (hour >= 5 && hour < 11) return THEMES.morning;
  if (hour >= 11 && hour < 17) return THEMES.afternoon;
  if (hour >= 17 && hour < 20) return THEMES.evening;
  return THEMES.night;
};
