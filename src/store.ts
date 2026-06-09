import { create } from 'zustand';

export interface Chant {
  id: string;
  pubkey: string;
  content: string;
  timestamp: number;
  isVerified: boolean;
  university?: string;
}

export interface Player {
  pubkey: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  skin: string;
  name: string;
  university?: string;
  isVerified: boolean;
  lastSeen: number;
  currentChant?: {
    text: string;
    expiresAt: number;
  };
}

interface AppState {
  currentSquare: string;
  chants: Chant[];
  userProfile: {
    pubkey: string | null;
    privkey: string | null;
    isVerified: boolean;
    university: string | null;
    attestation: string | null;
  };
  connectedRelays: number;
  rawPackets: any[]; // For Network Flow
  bannedPubkeys: Set<string>;
  reports: Record<string, number>;
  activeUsers: Set<string>;
  players: Record<string, Player>;
  
  setSquare: (square: string) => void;
  addChant: (chant: Chant) => void;
  setUserProfile: (profile: Partial<AppState['userProfile']>) => void;
  setConnectedRelays: (count: number) => void;
  addRawPacket: (packet: any) => void;
  banPubkey: (pubkey: string) => void;
  reportPubkey: (pubkey: string, isFromAdmin?: boolean) => void;
  registerActiveUser: (pubkey: string) => void;
  updatePlayer: (pubkey: string, data: Partial<Player>) => void;
  removePlayer: (pubkey: string) => void;
  triggerChantBubble: (pubkey: string, text: string) => void;
}

const loadSavedProfile = () => {
  try {
    const saved = window.localStorage.getItem('user_profile');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load user profile from cache', e);
  }
  return {
    isVerified: false,
    university: null,
    attestation: null
  };
};

const savedProfile = loadSavedProfile();

// 시뮬레이션을 활기차게 만들기 위한 모의(Mock) 시위 시민들
const createMockPlayers = (): Record<string, Player> => {
  const now = Date.now();
  return {
    'mock_eco': {
      pubkey: 'mock_eco',
      x: 100,
      y: 80,
      targetX: 100,
      targetY: 80,
      speed: 1.8,
      skin: 'eco',
      name: '환경수호자',
      isVerified: false,
      lastSeen: now,
      currentChant: {
        text: '기후 정의 지금 당장! 🌿',
        expiresAt: now + 6000
      }
    },
    'mock_student': {
      pubkey: 'mock_student',
      x: -120,
      y: -50,
      targetX: -120,
      targetY: -50,
      speed: 2.0,
      skin: 'student',
      name: '도서관지기',
      university: '서울대학교',
      isVerified: true,
      lastSeen: now,
      currentChant: {
        text: '등록금 동결을 요구한다! 🎓',
        expiresAt: now + 8000
      }
    },
    'mock_hacker': {
      pubkey: 'mock_hacker',
      x: 80,
      y: -120,
      targetX: 80,
      targetY: -120,
      speed: 2.2,
      skin: 'hacker',
      name: '익명시민X',
      isVerified: false,
      lastSeen: now,
      currentChant: {
        text: '자유로운 소통, 안전한 연대 🔒',
        expiresAt: now + 5000
      }
    }
  };
};

export const useStore = create<AppState>((set) => ({
  currentSquare: '광화문광장',
  chants: [],
  userProfile: {
    pubkey: null,
    privkey: null,
    isVerified: savedProfile.isVerified,
    university: savedProfile.university,
    attestation: savedProfile.attestation,
  },
  connectedRelays: 0,
  rawPackets: [],
  bannedPubkeys: new Set(),
  reports: {},
  activeUsers: new Set(),
  players: createMockPlayers(),
  
  setSquare: (square) => set({ 
    currentSquare: square, 
    chants: [], 
    activeUsers: new Set(),
    players: createMockPlayers() // 광장 전환 시 모의 캐릭터 재배치
  }),
  addChant: (chant) => set((state) => {
    if (state.bannedPubkeys.has(chant.pubkey)) return state;
    // 중복 제거: 이미 존재하는 ID의 구호이면 무시합니다.
    if (state.chants.some(c => c.id === chant.id)) return state;
    // Keep max 500 chants in memory to avoid lag
    const newChants = [chant, ...state.chants].slice(0, 500);
    
    // 메시지 수신 시 말풍선 트리거
    setTimeout(() => {
      useStore.getState().triggerChantBubble(chant.pubkey, chant.content);
    }, 10);

    return { chants: newChants };
  }),
  setUserProfile: (profile) => set((state) => {
    const newProfile = { ...state.userProfile, ...profile };
    // 로컬 스토리지에 유저 인증 프로필 캐싱
    window.localStorage.setItem('user_profile', JSON.stringify({
      isVerified: newProfile.isVerified,
      university: newProfile.university,
      attestation: newProfile.attestation
    }));

    const newPlayers = { ...state.players };
    if (newProfile.pubkey) {
      const existing = newPlayers[newProfile.pubkey];
      newPlayers[newProfile.pubkey] = {
        pubkey: newProfile.pubkey,
        x: existing?.x || 0,
        y: existing?.y || 0,
        targetX: existing?.targetX || 0,
        targetY: existing?.targetY || 0,
        speed: existing?.speed || 2.0,
        skin: newProfile.isVerified ? 'student' : 'hacker',
        name: newProfile.isVerified 
          ? `인증_${newProfile.university || '대학생'}` 
          : `익명_${newProfile.pubkey.substring(0, 4)}`,
        university: newProfile.university || undefined,
        isVerified: newProfile.isVerified,
        lastSeen: Date.now(),
        currentChant: existing?.currentChant
      };
    }

    return { userProfile: newProfile, players: newPlayers };
  }),
  setConnectedRelays: (count) => set({ connectedRelays: count }),
  addRawPacket: (packet) => set((state) => {
    // Keep max 50 packets in inspector
    const newPackets = [packet, ...state.rawPackets].slice(0, 50);
    return { rawPackets: newPackets };
  }),
  banPubkey: (pubkey) => set((state) => {
    const newBanned = new Set(state.bannedPubkeys);
    newBanned.add(pubkey);
    
    const newPlayers = { ...state.players };
    delete newPlayers[pubkey];

    return { 
      bannedPubkeys: newBanned,
      chants: state.chants.filter(c => c.pubkey !== pubkey),
      players: newPlayers
    };
  }),
  reportPubkey: (pubkey, isFromAdmin = false) => set((state) => {
    if (state.bannedPubkeys.has(pubkey)) return state;
    
    // 관리자가 차단한 경우 즉시 영구 차단
    if (isFromAdmin) {
      const newBanned = new Set(state.bannedPubkeys);
      newBanned.add(pubkey);
      const newPlayers = { ...state.players };
      delete newPlayers[pubkey];
      return { 
        bannedPubkeys: newBanned,
        chants: state.chants.filter(c => c.pubkey !== pubkey),
        players: newPlayers
      };
    }

    const currentReports = state.reports[pubkey] || 0;
    const newReports = currentReports + 1;
    
    // 10회 이상 누적 신고 시 블라인드(차단) 처리
    if (newReports >= 10) {
      const newBanned = new Set(state.bannedPubkeys);
      newBanned.add(pubkey);
      const newPlayers = { ...state.players };
      delete newPlayers[pubkey];
      return {
        reports: { ...state.reports, [pubkey]: newReports },
        bannedPubkeys: newBanned,
        chants: state.chants.filter(c => c.pubkey !== pubkey),
        players: newPlayers
      };
    }

    return { reports: { ...state.reports, [pubkey]: newReports } };
  }),
  registerActiveUser: (pubkey) => set((state) => {
    if (state.activeUsers.has(pubkey)) return state;
    const newActive = new Set(state.activeUsers);
    newActive.add(pubkey);
    return { activeUsers: newActive };
  }),
  updatePlayer: (pubkey, data) => set((state) => {
    if (state.bannedPubkeys.has(pubkey)) return state;
    
    const now = Date.now();
    const existing = state.players[pubkey];
    const updatedPlayer = existing
      ? { ...existing, ...data, lastSeen: now }
      : {
          pubkey,
          x: 0,
          y: 0,
          targetX: 0,
          targetY: 0,
          speed: 2.0,
          skin: 'hacker',
          name: pubkey.substring(0, 8),
          isVerified: false,
          ...data,
          lastSeen: now
        };

    return {
      players: {
        ...state.players,
        [pubkey]: updatedPlayer
      }
    };
  }),
  removePlayer: (pubkey) => set((state) => {
    const newPlayers = { ...state.players };
    delete newPlayers[pubkey];
    return { players: newPlayers };
  }),
  triggerChantBubble: (pubkey, text) => set((state) => {
    const player = state.players[pubkey];
    if (!player) return state;

    return {
      players: {
        ...state.players,
        [pubkey]: {
          ...player,
          currentChant: {
            text,
            expiresAt: Date.now() + 5000 // 5초간 말풍선 표시
          }
        }
      }
    };
  })
}));
