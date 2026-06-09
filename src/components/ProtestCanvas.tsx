import React, { useEffect, useRef } from 'react';
import { useStore } from '../store';
import type { Player } from '../store';
import { nostrService } from '../services/nostrService';
import type { TimeTheme } from '../utils/theme';
import { resolveUniversityName } from '../utils/university';

interface ClickRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

interface ProtestCanvasProps {
  timeTheme: TimeTheme;
}

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const drawTree = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.save();
  ctx.translate(x, y);
  // 그림자
  ctx.beginPath();
  ctx.ellipse(0, 10, 12, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.fill();
  // 줄기
  ctx.fillStyle = '#7a5c43';
  ctx.fillRect(-3.5, -2, 7, 12);
  // 잎사귀 (동글동글한 나무)
  ctx.beginPath();
  ctx.arc(0, -9, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#2d6a4f';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-4, -13, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#40916c';
  ctx.fill();
  ctx.restore();
};

const drawFlower = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
  ctx.save();
  ctx.translate(x, y);
  // 줄기/잎
  ctx.fillStyle = '#1b4332';
  ctx.fillRect(-0.7, 0, 1.4, 5);
  // 꽃잎 5개
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    ctx.rotate((Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.arc(0, -3, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // 가운데 노란색
  ctx.beginPath();
  ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd166';
  ctx.fill();
  ctx.restore();
};

const drawDuck = (ctx: CanvasRenderingContext2D, x: number, y: number, time: number) => {
  ctx.save();
  ctx.translate(x, y);
  const bobY = Math.sin(time * 3) * 1.5;
  ctx.translate(0, bobY);
  
  // 몸통
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd166';
  ctx.fill();
  
  // 머리
  ctx.beginPath();
  ctx.arc(4, -5, 4.2, 0, Math.PI * 2);
  ctx.fill();
  
  // 눈
  ctx.beginPath();
  ctx.arc(5, -6, 0.7, 0, Math.PI * 2);
  ctx.fillStyle = '#222';
  ctx.fill();
  
  // 부리
  ctx.beginPath();
  ctx.moveTo(8, -6);
  ctx.lineTo(11, -5);
  ctx.lineTo(8, -4);
  ctx.closePath();
  ctx.fillStyle = '#f3722c';
  ctx.fill();
  
  // 꼬리
  ctx.beginPath();
  ctx.moveTo(-5, -1);
  ctx.lineTo(-8, -4);
  ctx.lineTo(-4, -2);
  ctx.closePath();
  ctx.fillStyle = '#e9c46a';
  ctx.fill();
  
  ctx.restore();
};

export const ProtestCanvas: React.FC<ProtestCanvasProps> = ({ timeTheme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { players, userProfile, currentSquare, updatePlayer } = useStore();
  
  const themeRef = useRef(timeTheme);
  useEffect(() => {
    themeRef.current = timeTheme;
  }, [timeTheme]);
  
  // 렉의 원인이었던 Zustand 매 프레임 업데이트를 차단하기 위해
  // 캐릭터의 실시간 좌표(x, y) 연산을 전용 로컬 Ref에서 처리합니다.
  const localPlayersRef = useRef<Record<string, Player>>({});
  
  // 카메라 트래킹 상태
  const cameraRef = useRef({ x: 0, y: 0 });
  
  // 클릭 시 바닥 물결(Ripple) 리스트
  const ripplesRef = useRef<ClickRipple[]>([]);
  
  // 걷기 애니메이션을 위한 사이클 레퍼런스
  const walkCyclesRef = useRef<Record<string, number>>({});

  // Zustand 스토어의 플레이어 타겟 정보 등이 변경될 때만 로컬 Ref와 동기화 (React 렌더링 부하 차단)
  useEffect(() => {
    Object.values(players).forEach(storePlayer => {
      const local = localPlayersRef.current[storePlayer.pubkey];
      if (!local) {
        localPlayersRef.current[storePlayer.pubkey] = { ...storePlayer };
      } else {
        // x, y 좌표는 로컬 Ref가 주도하므로 동기화하지 않고 target 좌표 및 상태값만 갱신
        local.targetX = storePlayer.targetX;
        local.targetY = storePlayer.targetY;
        local.skin = storePlayer.skin;
        local.name = storePlayer.name;
        local.university = storePlayer.university;
        local.isVerified = storePlayer.isVerified;
        local.currentChant = storePlayer.currentChant;
        local.lastSeen = storePlayer.lastSeen;
      }
    });

    // 제거된 플레이어 정리
    Object.keys(localPlayersRef.current).forEach(pubkey => {
      if (!players[pubkey]) {
        delete localPlayersRef.current[pubkey];
      }
    });
  }, [players]);

  // 광장이 변경되면 캐릭터 상태 전면 리셋
  useEffect(() => {
    localPlayersRef.current = {};
    ripplesRef.current = [];
    cameraRef.current = { x: 0, y: 0 };
  }, [currentSquare]);

  // 10초 주기로 내 존재를 알리는 하트비트 위치 패킷만 전송 (암호 연산 부하 최소화)
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      const myPubkey = useStore.getState().userProfile.pubkey;
      if (!myPubkey) return;
      const localMe = localPlayersRef.current[myPubkey];
      if (localMe) {
        nostrService.publishLocation(localMe.x, localMe.y, localMe.targetX, localMe.targetY);
      }
    }, 10000);

    return () => clearInterval(heartbeatInterval);
  }, []);

  // 모의(Mock) 캐릭터들이 주기적으로 광장을 걷고 말하게 하는 AI 로직
  useEffect(() => {
    const mockInterval = setInterval(() => {
      const state = useStore.getState();
      const mockIds = ['mock_eco', 'mock_student', 'mock_hacker'];
      const randomMockId = mockIds[Math.floor(Math.random() * mockIds.length)];
      const mockPlayer = state.players[randomMockId];
      
      if (mockPlayer) {
        // 1. 랜덤 좌표로 이동 설정 (스토어 갱신 -> useEffect에서 Ref 동기화)
        const targetX = (Math.random() - 0.5) * 500;
        const targetY = (Math.random() - 0.5) * 400;
        
        useStore.getState().updatePlayer(randomMockId, {
          targetX,
          targetY
        });

        // 2. 가끔 랜덤 구호 외침
        if (Math.random() > 0.4) {
          const chantsBySkin: Record<string, string[]> = {
            eco: [
              '지구를 지켜냅시다! 🌍',
              '더 늦기 전에 기후 행동! ♻️',
              '자연과 인류의 평화적 공존 🌸',
              '일회용 플라스틱을 금지하라!'
            ],
            student: [
              '학생들의 자치권을 보장하라! ✊',
              '학문 연구의 자유를 지켜내자!',
              '대학 재정 투명성을 공개하라 🎓',
              '우리의 배움은 멈추지 않는다!'
            ],
            hacker: [
              '인터넷 검열 반대! 💻',
              '데이터 주권을 시민에게! 🔒',
              '분산형 보안 연대 만세!',
              '정보 공유는 인류의 권리다.'
            ]
          };
          
          const pool = chantsBySkin[mockPlayer.skin] || ['목소리를 냅시다!'];
          const randomChant = pool[Math.floor(Math.random() * pool.length)];
          
          useStore.getState().triggerChantBubble(randomMockId, randomChant);
        }
      }
    }, 4000);

    return () => clearInterval(mockInterval);
  }, []);

  // 60FPS 애니메이션 및 물리 업데이트 렌더 루프
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', resize);
    resize();

    // 렌더 프레임 루프
    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const logicalWidth = canvas.width / dpr;
      const logicalHeight = canvas.height / dpr;
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);
      
      const myPubkey = userProfile.pubkey || '';
      const localPlayer = localPlayersRef.current[myPubkey];
      
      // 1. 카메라 스무스 트래킹 (본인 캐릭터를 화면 정중앙에 고정)
      if (localPlayer) {
        cameraRef.current.x += (localPlayer.x - cameraRef.current.x) * 0.1;
        cameraRef.current.y += (localPlayer.y - cameraRef.current.y) * 0.1;
      }
      
      const centerX = logicalWidth / 2 - cameraRef.current.x;
      const centerY = logicalHeight / 2 - cameraRef.current.y;

      // 2. 배경 그리드 및 맵 요소 렌더링
      drawMap(ctx, centerX, centerY, logicalWidth, logicalHeight);

      // 3. 클릭 리플(Ripple) 업데이트 및 드로잉
      ctx.save();
      ripplesRef.current = ripplesRef.current.filter(ripple => {
        ripple.radius += (ripple.maxRadius - ripple.radius) * 0.1;
        ripple.alpha += (0 - ripple.alpha) * 0.08;
        
        ctx.beginPath();
        ctx.arc(centerX + ripple.x, centerY + ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(themeRef.current.accent, ripple.alpha);
        ctx.lineWidth = 3;
        ctx.stroke();
        
        return ripple.alpha > 0.01;
      });
      ctx.restore();

      // 4. 캐릭터 위치 물리 연산 (로컬 Ref 직접 변경) 및 렌더링
      const playersList = Object.values(localPlayersRef.current);
      
      // Y-Sorting (캐릭터 겹침 깊이 처리)
      playersList.sort((a, b) => a.y - b.y);

      playersList.forEach(player => {
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        let isMoving = false;

        if (distance > 2) {
          isMoving = true;
          const speed = player.speed;
          const moveDist = Math.min(distance, speed);
          player.x += (dx / distance) * moveDist;
          player.y += (dy / distance) * moveDist;
        } else {
          player.x = player.targetX;
          player.y = player.targetY;
        }

        // 걷기 애니메이션 프레임 증가
        if (isMoving) {
          walkCyclesRef.current[player.pubkey] = (walkCyclesRef.current[player.pubkey] || 0) + 0.2;
        } else {
          walkCyclesRef.current[player.pubkey] = 0;
        }

        // 아바타 그리기
        ctx.save();
        ctx.translate(centerX + player.x, centerY + player.y);
        drawAvatar(ctx, player, walkCyclesRef.current[player.pubkey] || 0, isMoving);
        ctx.restore();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [userProfile.pubkey]);

  // 마우스 클릭 시 캐릭터의 목적지 설정 및 1회성 네트워크 패킷 전송
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const myPubkey = userProfile.pubkey;
    if (!myPubkey) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 화면 상의 클릭 위치를 월드 좌표로 변환
    const worldX = clickX - rect.width / 2 + cameraRef.current.x;
    const worldY = clickY - rect.height / 2 + cameraRef.current.y;

    // 1. 스토어의 목적지만 변경 (이것은 렌더링 루프 내부가 아니므로 부하가 적습니다)
    updatePlayer(myPubkey, {
      targetX: worldX,
      targetY: worldY
    });

    // 2. 로컬 Ref의 목적지도 즉시 갱신해 즉시 이동 시작
    const localMe = localPlayersRef.current[myPubkey];
    if (localMe) {
      localMe.targetX = worldX;
      localMe.targetY = worldY;
      
      // 3. 클릭하여 이동을 개시할 때만 네트워크에 좌표 브로드캐스트 전송 (단 1회!)
      nostrService.publishLocation(localMe.x, localMe.y, worldX, worldY);
    }

    // 클릭 지점에 물결 리플 생성
    ripplesRef.current.push({
      x: worldX,
      y: worldY,
      radius: 0,
      maxRadius: 25,
      alpha: 1.0
    });
  };

  // 가상 맵(광장) 그리기 함수 (Cozy RPG 스타일)
  const drawMap = (ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) => {
    const time = Date.now() / 1000;

    // 1. 전체 화면 잔디밭 색상으로 채움
    ctx.fillStyle = themeRef.current.grassColor;
    ctx.fillRect(0, 0, w, h);

    // 2. 십자형 돌길(Stone Pavement) 산책로 그리기 (분수대 중심)
    ctx.fillStyle = themeRef.current.pathColor;
    
    // 가로 산책로
    ctx.fillRect(cx - 600, cy - 30, 1200, 60);
    // 세로 산책로
    ctx.fillRect(cx - 30, cy - 600, 60, 1200);

    // 중앙 원형 돌길 광장
    ctx.beginPath();
    ctx.arc(cx, cy, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. 캔버스를 기준으로 잔디밭 위의 목재 울타리(경계선) 그리기
    ctx.strokeStyle = '#8c6239';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 600, 0, Math.PI * 2);
    ctx.stroke();
    
    // 울타리 기둥들 그리기
    const postCount = 72;
    ctx.fillStyle = '#a67c52';
    for (let i = 0; i < postCount; i++) {
      const angle = (i * Math.PI * 2) / postCount;
      const px = cx + Math.cos(angle) * 600;
      const py = cy + Math.sin(angle) * 600;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5c3d24';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 4. 나무들 배치하기
    const treePositions = [
      { x: -220, y: -220 },
      { x: 220, y: -220 },
      { x: -220, y: 220 },
      { x: 220, y: 220 },
      { x: -380, y: -120 },
      { x: 380, y: -120 },
      { x: -380, y: 120 },
      { x: 380, y: 120 },
      { x: -120, y: -380 },
      { x: 120, y: -380 },
      { x: -120, y: 380 },
      { x: 120, y: 380 }
    ];
    treePositions.forEach(p => {
      drawTree(ctx, cx + p.x, cy + p.y);
    });

    // 5. 예쁜 꽃들 배치하기
    const flowerPositions = [
      { x: -120, y: -120, color: '#f26419' },
      { x: -140, y: -100, color: '#f6bd60' },
      { x: -100, y: -140, color: '#f28482' },
      
      { x: 120, y: -120, color: '#f28482' },
      { x: 140, y: -140, color: '#f6bd60' },
      
      { x: -120, y: 120, color: '#f6bd60' },
      { x: 120, y: 120, color: '#f26419' }
    ];
    flowerPositions.forEach(f => {
      drawFlower(ctx, cx + f.x, cy + f.y, f.color);
    });

    // 6. 중앙 아기자기 분수대 (Central Fountain)
    ctx.save();
    ctx.translate(cx, cy);

    // 석조 분수대 테두리
    ctx.beginPath();
    ctx.arc(0, 0, 45, 0, Math.PI * 2);
    ctx.fillStyle = '#b8b8b8';
    ctx.fill();
    ctx.strokeStyle = '#8c8c8c';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 분수 안 물
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.fillStyle = '#a2d2ff';
    ctx.fill();

    // 동적 물줄기 퍼짐 링 애니메이션
    const waveRadius = ((Date.now() / 2000) % 1) * 32;
    ctx.beginPath();
    ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${1 - waveRadius / 32})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 분수 중심부 솟구치는 물방울 발광 코어
    const coreGlow = 10 + Math.abs(Math.sin(time * 6)) * 4;
    const waterGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, coreGlow);
    waterGlow.addColorStop(0, '#ffffff');
    waterGlow.addColorStop(0.4, '#e0f2fe');
    waterGlow.addColorStop(1, 'rgba(162, 210, 255, 0)');
    ctx.beginPath();
    ctx.arc(0, 0, coreGlow, 0, Math.PI * 2);
    ctx.fillStyle = waterGlow;
    ctx.fill();

    // 노란색 러버덕 분수 안에서 빙글빙글 돌기/둥둥 뜨기
    const duckAngle = time * 0.5;
    const duckDist = 20;
    const dx = Math.cos(duckAngle) * duckDist;
    const dy = Math.sin(duckAngle) * duckDist;
    drawDuck(ctx, dx, dy, time);

    ctx.restore();
  };

  // 귀여운 2D 벡터 아바타 그리기 함수 (동물의 숲 / Cozy RPG 스타일)
  const drawAvatar = (ctx: CanvasRenderingContext2D, player: Player, cycle: number, isMoving: boolean) => {
    const bobY = isMoving ? Math.abs(Math.sin(cycle)) * -3.5 : Math.sin(Date.now() / 250) * -0.8;
    
    let bodyColor = '#a67c52'; // 기본 다람쥐/갈색 동물
    
    if (player.skin === 'student') {
      bodyColor = '#4a90e2'; // 파란 토끼
    } else if (player.skin === 'eco') {
      bodyColor = '#2a9d8f'; // 초록 버섯돌이
    }

    // 1. 그림자
    ctx.beginPath();
    ctx.ellipse(0, 3, 10, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fill();

    // 발
    if (isMoving) {
      const footOffset = Math.sin(cycle) * 5;
      ctx.fillStyle = '#444';
      ctx.beginPath();
      ctx.arc(-5, 2 + (footOffset > 0 ? -2 : 0), 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(5, 2 + (footOffset < 0 ? -2 : 0), 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#444';
      ctx.beginPath();
      ctx.arc(-4, 2, 3.5, 0, Math.PI * 2);
      ctx.arc(4, 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. 동물 귀 / 버섯 갓 장식 (몸통 전에 귀를 먼저 그려서 레이어 정리)
    if (player.skin === 'student') {
      // 파란 토끼 귀
      ctx.fillStyle = '#4a90e2';
      // 왼쪽 귀
      ctx.save();
      ctx.translate(-5, -24 + bobY);
      ctx.rotate(-Math.PI / 12);
      ctx.beginPath();
      ctx.roundRect(-2.5, -10, 5, 12, 2.5);
      ctx.fill();
      ctx.fillStyle = '#ffccd5';
      ctx.beginPath();
      ctx.roundRect(-1.2, -8, 2.4, 9, 1.2);
      ctx.fill();
      ctx.restore();
      // 오른쪽 귀
      ctx.fillStyle = '#4a90e2';
      ctx.save();
      ctx.translate(5, -24 + bobY);
      ctx.rotate(Math.PI / 12);
      ctx.beginPath();
      ctx.roundRect(-2.5, -10, 5, 12, 2.5);
      ctx.fill();
      ctx.fillStyle = '#ffccd5';
      ctx.beginPath();
      ctx.roundRect(-1.2, -8, 2.4, 9, 1.2);
      ctx.fill();
      ctx.restore();
    } else if (player.skin === 'eco') {
      // 초록/빨강 버섯 갓 (머리 뒤/위에 그려짐)
      ctx.fillStyle = '#e76f51'; // 포근한 버섯돌이 오렌지레드
      ctx.beginPath();
      ctx.arc(0, -24 + bobY, 13, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      
      // 버섯 갓 점박이
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-6, -28 + bobY, 2, 0, Math.PI * 2);
      ctx.arc(6, -26 + bobY, 2, 0, Math.PI * 2);
      ctx.arc(0, -32 + bobY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 기본 갈색 다람쥐 귀
      ctx.fillStyle = '#a67c52';
      // 왼쪽 귀
      ctx.beginPath();
      ctx.arc(-7, -25 + bobY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffccd5';
      ctx.beginPath();
      ctx.arc(-7, -25 + bobY, 2, 0, Math.PI * 2);
      ctx.fill();
      // 오른쪽 귀
      ctx.fillStyle = '#a67c52';
      ctx.beginPath();
      ctx.arc(7, -25 + bobY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffccd5';
      ctx.beginPath();
      ctx.arc(7, -25 + bobY, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. 몸통
    ctx.beginPath();
    ctx.arc(0, -10 + bobY, 11, 0, Math.PI, true);
    ctx.lineTo(-11, bobY);
    ctx.lineTo(11, bobY);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.stroke();

    // 4. 머리 후드
    ctx.beginPath();
    ctx.arc(0, -21 + bobY, 10.5, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor;
    ctx.fill();

    // 5. 살구색 귀여운 얼굴 & 이목구비
    ctx.beginPath();
    ctx.arc(0, -20 + bobY, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff5eb'; // 크림 살구색 얼굴판
    ctx.fill();

    // 눈 (웃는 모습 또는 동그란 눈)
    ctx.fillStyle = '#3a2e2b'; // 부드러운 다크 브라운 눈
    ctx.beginPath();
    ctx.arc(-3, -20 + bobY, 1.2, 0, Math.PI * 2);
    ctx.arc(3, -20 + bobY, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // 볼터치
    ctx.fillStyle = 'rgba(255, 120, 120, 0.45)';
    ctx.beginPath();
    ctx.arc(-5.5, -17.5 + bobY, 1.8, 0, Math.PI * 2);
    ctx.arc(5.5, -17.5 + bobY, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 6. 대학생 학사모 장식 (인증 유저만 - 귀 위에 씌우기)
    if (player.isVerified) {
      ctx.save();
      ctx.translate(0, -32 + bobY);
      
      ctx.fillStyle = '#5c4d3c'; // 우드브라운 톤 학사모
      ctx.strokeStyle = '#d4a373';
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 3);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(0, 1, 4, 0, Math.PI);
      ctx.fillStyle = '#403d39';
      ctx.fill();

      ctx.restore();
    }

    // 7. 이름표 & 대학교 텍스트 (숲속 공원 표지판 스타일)
    const displayName = player.name.includes('인증_') && player.university
      ? `인증_${resolveUniversityName(player.university)}`
      : player.name;

    ctx.fillStyle = 'rgba(255, 253, 245, 0.92)'; // 아이보리색 나무판
    ctx.beginPath();
    const nameWidth = ctx.measureText(displayName).width;
    ctx.roundRect(-nameWidth / 2 - 6, 8, nameWidth + 12, 14, 5);
    ctx.fill();
    ctx.strokeStyle = player.isVerified ? '#2b9348' : '#8c6239'; // 나뭇잎 그린 / 나무 브라운 테두리
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#4a2c00'; // 부드러운 다크 우드 텍스트
    ctx.font = 'bold 9px Pretendard';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayName, 0, 15);

    if (player.university) {
      ctx.fillStyle = '#b76935'; // 따뜻한 오렌지/브라운 대학교 텍스트
      ctx.font = '9px Pretendard';
      ctx.fillText(`🌱 ${resolveUniversityName(player.university)}`, 0, 28);
    }

    // 8. 실시간 말풍선 (아기자기한 화이트크림 말풍선)
    if (player.currentChant && Date.now() < player.currentChant.expiresAt) {
      const bubbleText = player.currentChant.text;
      ctx.font = 'bold 11px Pretendard';
      const textWidth = ctx.measureText(bubbleText).width;
      const bubbleW = Math.max(70, textWidth + 16);
      const bubbleH = 26;
      const bubbleX = -bubbleW / 2;
      const bubbleY = -52 + bobY;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      ctx.beginPath();
      ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 8);
      ctx.fill();
      ctx.strokeStyle = player.isVerified ? '#2b9348' : '#8c6239';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      ctx.beginPath();
      ctx.moveTo(-5, bubbleY + bubbleH);
      ctx.lineTo(5, bubbleY + bubbleH);
      ctx.lineTo(0, bubbleY + bubbleH + 4);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = player.isVerified ? '#2b9348' : '#8c6239';
      ctx.beginPath();
      ctx.moveTo(-5, bubbleY + bubbleH);
      ctx.lineTo(0, bubbleY + bubbleH + 4);
      ctx.lineTo(5, bubbleY + bubbleH);
      ctx.stroke();

      ctx.fillStyle = '#2b1c00';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bubbleText, 0, bubbleY + bubbleH / 2);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      className="absolute top-0 left-0 w-full h-full cursor-crosshair z-0 animate-fade-in"
    />
  );
};
