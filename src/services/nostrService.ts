import { SimplePool } from 'nostr-tools';
import { useStore } from '../store';
import { verifyChantEvent, MASTER_PUBKEY, createLocationEvent } from '../utils/nostr';

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://relay.primal.net'
];

class NostrService {
  private pool: SimplePool;
  private currentSub: any;
  private pruneInterval: any;
  private processedEventIds = new Set<string>();

  constructor() {
    this.pool = new SimplePool({
      enableReconnect: true,
      enablePing: true
    } as any);

    // 실제 연결 성공/실패 시 상태 동기화
    this.pool.onRelayConnectionSuccess = () => {
      this.updateConnectionStatus();
    };
    this.pool.onRelayConnectionFailure = () => {
      this.updateConnectionStatus();
    };

    // 10초마다 오프라인 유저 정리 실행
    if (typeof window !== 'undefined') {
      this.pruneInterval = setInterval(() => {
        this.pruneInactivePlayers();
      }, 10000);
    }
  }

  private updateConnectionStatus() {
    const statusMap = this.pool.listConnectionStatus();
    let connectedCount = 0;
    statusMap.forEach((connected) => {
      if (connected) connectedCount++;
    });
    useStore.getState().setConnectedRelays(connectedCount);
  }

  async connect() {
    // 릴레이 선제 연결 시도
    for (const relay of DEFAULT_RELAYS) {
      this.pool.ensureRelay(relay).catch((err) => {
        console.error(`Initial connection failed for ${relay}:`, err);
      });
    }
    this.updateConnectionStatus();
  }

  subscribeToSquare(square: string) {
    if (this.currentSub) {
      this.currentSub.close();
    }

    // 새 광장 진입 시 중복 방지 캐시 초기화
    this.processedEventIds.clear();

    // 중요: subscribeMany는 단일 Filter 객체를 요구하므로 배열로 감싸지 않습니다.
    // 무거운 서명 검증 연산 부하를 줄이기 위해 초기 동기화 제한(limit)을 100에서 25로 축소합니다.
    const filter = {
      kinds: [1, 1984, 20005],
      '#t': [square],
      limit: 25,
    };

    console.log(`Subscribing to square "${square}" with filter:`, filter);

    this.currentSub = this.pool.subscribeMany(
      DEFAULT_RELAYS,
      filter,
      {
        onevent: (event) => {
          // 중복 패킷은 비싼 암호 서명 검증을 수행하기 전에 즉시 필터링하여 버림 (성능 핵심 최적화)
          if (this.processedEventIds.has(event.id)) return;
          this.processedEventIds.add(event.id);

          // 1. 이벤트 서명 무결성 검증 (무거운 타원곡선 수학 연산 수행)
          const isSignatureValid = verifyChantEvent(event);
          
          // 패킷 인스펙터에 전달 (Kind 20005 위치 패킷도 원시로그로 표시)
          useStore.getState().addRawPacket({
            ...event,
            isVerified: isSignatureValid
          });

          if (!isSignatureValid) {
            console.warn('Received event with invalid signature:', event.id);
            return;
          }

          // 활성 사용자 목록에 등록
          useStore.getState().registerActiveUser(event.pubkey);

          // Kind 20005: 실시간 아바타 위치 패킷 처리
          if (event.kind === 20005) {
            // 본인의 위치 패킷 메아리(Echo)는 무시하여 버벅임/되감기 현상 방지
            if (event.pubkey === useStore.getState().userProfile.pubkey) return;

            try {
              const data = JSON.parse(event.content);
              useStore.getState().updatePlayer(event.pubkey, {
                pubkey: event.pubkey,
                x: data.x,
                y: data.y,
                targetX: data.targetX,
                targetY: data.targetY,
                skin: data.skin,
                name: data.name || event.pubkey.substring(0, 8),
                university: data.university,
                isVerified: !!data.university
              });
            } catch (e) {
              console.error('Failed to parse location event:', e);
            }
            return;
          }

          // Kind 1984: 사용자 신고 및 차단 패킷 처리
          if (event.kind === 1984) {
            const targetPubkeyTag = event.tags.find((t: string[]) => t[0] === 'p');
            if (targetPubkeyTag && targetPubkeyTag[1]) {
              const targetPubkey = targetPubkeyTag[1];
              // 마스터 관리자의 패킷이면 즉시 글로벌 차단
              const isFromAdmin = event.pubkey === MASTER_PUBKEY;
              useStore.getState().reportPubkey(targetPubkey, isFromAdmin);
            }
            return; // 신고 패킷은 피드(Chant)에 표시하지 않음
          }

          // 2. 대학생 인증 보증서 파싱
          const attestationTag = event.tags.find((t: string[]) => t[0] === 'attestation');
          const isStudentVerified = !!attestationTag;
          const university = attestationTag ? attestationTag[2] : undefined;

          // 3. 스토어에 추가 및 말풍선 자동 트리거
          useStore.getState().addChant({
            id: event.id,
            pubkey: event.pubkey,
            content: event.content,
            timestamp: event.created_at,
            isVerified: isStudentVerified,
            university: university
          });

          // 플레이어 아바타 이름/스킨 정보 강제 갱신
          useStore.getState().updatePlayer(event.pubkey, {
            isVerified: isStudentVerified,
            university: university,
            skin: isStudentVerified ? 'student' : 'hacker'
          });
        },
        oneose() {
          console.log('Eose reached for square', square);
        }
      }
    );
  }

  async publish(event: any) {
    try {
      if (event.id) {
        this.processedEventIds.add(event.id);
      }
      console.log('Publishing event to relays:', event);
      const pubs = this.pool.publish(DEFAULT_RELAYS, event);
      await Promise.any(pubs);
      // 자신의 키도 활성 사용자로 등록
      useStore.getState().registerActiveUser(event.pubkey);
      return true;
    } catch (e) {
      console.error('Failed to publish event:', e);
      return false;
    }
  }

  // 내 실시간 위치를 다른 유저들에게 브로드캐스트 (Kind 20005 Ephemeral)
  async publishLocation(x: number, y: number, targetX: number, targetY: number) {
    try {
      const state = useStore.getState();
      if (!state.userProfile.pubkey) return;

      const event = createLocationEvent(x, y, targetX, targetY, state.currentSquare);
      const pubs = this.pool.publish(DEFAULT_RELAYS, event);
      await Promise.any(pubs);
    } catch (e) {
      // Ephemeral은 연결 유실 시 단순 누락되어도 무방함
      console.debug('Failed to publish location heartbeat:', e);
    }
  }

  // 30초 동안 신호가 끊긴 유저를 퇴장시킴 (heartbeat timeout)
  private pruneInactivePlayers() {
    const state = useStore.getState();
    const now = Date.now();
    
    Object.values(state.players).forEach(player => {
      if (player.pubkey.startsWith('mock_')) return; // 모의 유저는 제외
      if (player.pubkey === state.userProfile.pubkey) return; // 본인은 제외

      if (now - player.lastSeen > 30000) {
        state.removePlayer(player.pubkey);
      }
    });
  }

  destroy() {
    if (this.pruneInterval) clearInterval(this.pruneInterval);
    if (this.currentSub) this.currentSub.close();
    this.pool.destroy();
  }
}

export const nostrService = new NostrService();
