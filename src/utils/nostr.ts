import { generateSecretKey, getPublicKey, finalizeEvent, verifyEvent } from 'nostr-tools/pure';
import type { EventTemplate, Event } from 'nostr-tools/pure';
import { useStore } from '../store';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

// 브라우저 로드 시 임시 키쌍 생성 및 캐싱
export const initNostrKeys = () => {
  let skHex = window.localStorage.getItem('nostr_privkey');
  let sk: Uint8Array;
  let pk: string;
  
  if (skHex) {
    try {
      sk = hexToBytes(skHex);
      pk = getPublicKey(sk);
    } catch (e) {
      // 파싱 실패 시 초기화 후 재생성
      sk = generateSecretKey();
      pk = getPublicKey(sk);
      skHex = bytesToHex(sk);
      window.localStorage.setItem('nostr_privkey', skHex);
    }
  } else {
    sk = generateSecretKey();
    pk = getPublicKey(sk);
    skHex = bytesToHex(sk);
    window.localStorage.setItem('nostr_privkey', skHex);
  }
  
  useStore.getState().setUserProfile({
    pubkey: pk,
    privkey: skHex,
  });
  
  // 최초 로드 시 자기 자신을 플레이어로 등록
  useStore.getState().updatePlayer(pk, {
    pubkey: pk,
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    skin: useStore.getState().userProfile.isVerified ? 'student' : 'hacker',
    name: useStore.getState().userProfile.isVerified 
      ? `인증유저_${pk.substring(0, 4)}` 
      : `익명시민_${pk.substring(0, 4)}`,
    university: useStore.getState().userProfile.university || undefined,
    isVerified: useStore.getState().userProfile.isVerified
  });
  
  return { pk, skHex };
};

// 마스터 공개키 (백엔드 Vercel API가 이 키의 프라이빗키를 가짐)
// 개발용 임시 마스터 공개키 (실제 배포시에는 고정된 마스터 키 사용)
export const MASTER_PUBKEY = "master_pubkey_placeholder"; 

export const createLocationEvent = (x: number, y: number, targetX: number, targetY: number, square: string): Event => {
  const state = useStore.getState();
  const skHex = state.userProfile.privkey;
  if (!skHex) throw new Error("No private key");
  
  const sk = hexToBytes(skHex);
  
  const payload = {
    x: Math.round(x),
    y: Math.round(y),
    targetX: Math.round(targetX),
    targetY: Math.round(targetY),
    skin: state.userProfile.isVerified ? 'student' : 'hacker',
    name: state.userProfile.isVerified 
      ? `인증_${state.userProfile.university || '대학생'}` 
      : `익명_${state.userProfile.pubkey?.substring(0, 4)}`,
    university: state.userProfile.university || undefined
  };
  
  const eventTemplate: EventTemplate = {
    kind: 20005, // Ephemeral location kind
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["t", square]
    ],
    content: JSON.stringify(payload)
  };
  
  return finalizeEvent(eventTemplate, sk);
};

export const createReportEvent = (targetPubkey: string): Event => {
  const state = useStore.getState();
  const skHex = state.userProfile.privkey;
  if (!skHex) throw new Error("No private key");
  
  const sk = hexToBytes(skHex);
  
  const eventTemplate: EventTemplate = {
    kind: 1984, // Report kind
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["p", targetPubkey],
    ],
    content: "report",
  };
  
  return finalizeEvent(eventTemplate, sk);
};

export const createChantEvent = (content: string, square: string): Event => {
  const state = useStore.getState();
  const skHex = state.userProfile.privkey;
  if (!skHex) throw new Error("No private key");
  
  const sk = hexToBytes(skHex);
  
  const tags = [
    ["t", square],
  ];
  
  // 인증된 유저라면 보증서(Attestation) 첨부
  if (state.userProfile.isVerified && state.userProfile.attestation && state.userProfile.university) {
    tags.push(["attestation", state.userProfile.attestation, state.userProfile.university]);
  }
  
  const eventTemplate: EventTemplate = {
    kind: 1, // Standard text note
    created_at: Math.floor(Date.now() / 1000),
    tags: tags,
    content: content,
  };
  
  return finalizeEvent(eventTemplate, sk);
};

export const verifyChantEvent = (event: Event) => {
  return verifyEvent(event);
};
