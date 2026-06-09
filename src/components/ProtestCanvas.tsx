import React, { useEffect, useRef } from 'react';
import { useStore } from '../store';
import type { Player } from '../store';
import { nostrService } from '../services/nostrService';

interface ClickRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export const ProtestCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { players, userProfile, currentSquare, updatePlayer } = useStore();
  
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
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // 렌더 프레임 루프
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const myPubkey = userProfile.pubkey || '';
      const localPlayer = localPlayersRef.current[myPubkey];
      
      // 1. 카메라 스무스 트래킹 (본인 캐릭터를 화면 정중앙에 고정)
      if (localPlayer) {
        cameraRef.current.x += (localPlayer.x - cameraRef.current.x) * 0.1;
        cameraRef.current.y += (localPlayer.y - cameraRef.current.y) * 0.1;
      }
      
      const centerX = canvas.width / 2 - cameraRef.current.x;
      const centerY = canvas.height / 2 - cameraRef.current.y;

      // 2. 배경 그리드 및 맵 요소 렌더링
      drawMap(ctx, centerX, centerY, canvas.width, canvas.height);

      // 3. 클릭 리플(Ripple) 업데이트 및 드로잉
      ctx.save();
      ripplesRef.current = ripplesRef.current.filter(ripple => {
        ripple.radius += (ripple.maxRadius - ripple.radius) * 0.1;
        ripple.alpha += (0 - ripple.alpha) * 0.08;
        
        ctx.beginPath();
        ctx.arc(centerX + ripple.x, centerY + ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(57, 255, 20, ${ripple.alpha})`;
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
    const worldX = clickX - canvas.width / 2 + cameraRef.current.x;
    const worldY = clickY - canvas.height / 2 + cameraRef.current.y;

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

  // 가상 맵(광장) 그리기 함수
  const drawMap = (ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) => {
    // 1. 보도블록 그리드 패턴
    const gridSize = 80;
    const startX = Math.floor((-cx) / gridSize) * gridSize;
    const startY = Math.floor((-cy) / gridSize) * gridSize;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = startX; x < startX + w + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(cx + x, 0);
      ctx.lineTo(cx + x, h);
      ctx.stroke();
    }
    for (let y = startY; y < startY + h + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, cy + y);
      ctx.lineTo(w, cy + y);
      ctx.stroke();
    }

    // 2. 광장 외곽 제한 원
    ctx.beginPath();
    ctx.arc(cx, cy, 600, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 3. 중심 동심원 라인들
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.lineWidth = 2;
    [150, 300, 450].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 4. 중앙 홀로그램 모뉴먼트
    const time = Date.now() / 1000;
    ctx.save();
    ctx.translate(cx, cy);
    
    // 외곽 회전 홀로그램 링
    ctx.rotate(time * 0.2);
    ctx.strokeStyle = 'rgba(57, 255, 20, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 30]);
    ctx.beginPath();
    ctx.arc(0, 0, 75, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.rotate(-time * 0.4);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, 55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 모뉴먼트 중앙 발광 코어
    const glowGradient = ctx.createRadialGradient(cx, cy, 5, cx, cy, 45);
    glowGradient.addColorStop(0, 'rgba(0, 240, 255, 0.6)');
    glowGradient.addColorStop(0.3, 'rgba(0, 240, 255, 0.3)');
    glowGradient.addColorStop(1, 'rgba(0, 240, 255, 0)');
    
    ctx.beginPath();
    ctx.arc(cx, cy, 45, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();

    // 5. 모뉴먼트 피라미드 크리스탈 탑 드로잉
    ctx.save();
    ctx.translate(cx, cy - 10);
    const floatY = Math.sin(time * 2) * 5;
    ctx.translate(0, floatY);
    
    ctx.rotate(time * 0.8);
    
    // 유리 피라미드 그리기
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(-15, 10);
    ctx.lineTo(15, 10);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // 안쪽 회전 마이크로 큐브
    ctx.rotate(-time * 1.5);
    ctx.fillStyle = '#39FF14';
    ctx.fillRect(-4, -4, 8, 8);
    
    ctx.restore();
  };

  // 귀여운 2D 벡터 아바타 그리기 함수
  const drawAvatar = (ctx: CanvasRenderingContext2D, player: Player, cycle: number, isMoving: boolean) => {
    const bobY = isMoving ? Math.abs(Math.sin(cycle)) * -3.5 : Math.sin(Date.now() / 250) * -0.8;
    
    let bodyColor = '#2b2b2b';
    let detailColor = '#39FF14';
    
    if (player.skin === 'student') {
      bodyColor = '#1e3c72';
      detailColor = '#FFD700';
    } else if (player.skin === 'eco') {
      bodyColor = '#1b4d3e';
      detailColor = '#FF69B4';
    }

    // 1. 그림자
    ctx.beginPath();
    ctx.ellipse(0, 3, 10, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    // 발
    if (isMoving) {
      const footOffset = Math.sin(cycle) * 5;
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(-5, 2 + (footOffset > 0 ? -2 : 0), 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(5, 2 + (footOffset < 0 ? -2 : 0), 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(-4, 2, 3.5, 0, Math.PI * 2);
      ctx.arc(4, 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. 몸통
    ctx.beginPath();
    ctx.arc(0, -10 + bobY, 11, 0, Math.PI, true);
    ctx.lineTo(-11, bobY);
    ctx.lineTo(11, bobY);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.stroke();

    // 3. 머리 후드
    ctx.beginPath();
    ctx.arc(0, -21 + bobY, 10.5, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor;
    ctx.fill();

    // 4. 고글/바이저
    ctx.beginPath();
    ctx.roundRect(-7.5, -23 + bobY, 15, 6, 2.5);
    ctx.fillStyle = '#050505';
    ctx.fill();
    ctx.strokeStyle = detailColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.fillStyle = detailColor;
    ctx.fillRect(-5, -21 + bobY, 10, 1.5);

    // 5. 대학생 학사모 장식
    if (player.isVerified) {
      ctx.save();
      ctx.translate(0, -31 + bobY);
      
      ctx.fillStyle = '#181818';
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(12, 0);
      ctx.lineTo(0, 4);
      ctx.lineTo(-12, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(0, 1, 5, 0, Math.PI);
      ctx.fillStyle = '#111';
      ctx.fill();

      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-9, 3);
      ctx.lineTo(-9, 7);
      ctx.stroke();

      ctx.restore();
    }

    // 6. 이름표 & 대학교 텍스트
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    const nameWidth = ctx.measureText(player.name).width;
    ctx.roundRect(-nameWidth / 2 - 6, 8, nameWidth + 12, 14, 4);
    ctx.fill();
    ctx.strokeStyle = player.isVerified ? 'rgba(57, 255, 20, 0.25)' : 'rgba(255,255,255,0.06)';
    ctx.stroke();

    ctx.fillStyle = player.isVerified ? '#39FF14' : '#ffffff';
    ctx.font = 'bold 9px Pretendard';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.name, 0, 15);

    if (player.university) {
      ctx.fillStyle = '#FFD700';
      ctx.font = '9px Pretendard';
      ctx.fillText(`🎓 ${player.university}`, 0, 28);
    }

    // 7. 실시간 말풍선
    if (player.currentChant && Date.now() < player.currentChant.expiresAt) {
      const bubbleText = player.currentChant.text;
      ctx.font = '500 11px Pretendard';
      const textWidth = ctx.measureText(bubbleText).width;
      const bubbleW = Math.max(70, textWidth + 16);
      const bubbleH = 26;
      const bubbleX = -bubbleW / 2;
      const bubbleY = -52 + bobY;

      ctx.fillStyle = 'rgba(5, 5, 5, 0.85)';
      ctx.beginPath();
      ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 6);
      ctx.fill();
      ctx.strokeStyle = player.isVerified ? '#39FF14' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = 'rgba(5, 5, 5, 0.85)';
      ctx.beginPath();
      ctx.moveTo(-5, bubbleY + bubbleH);
      ctx.lineTo(5, bubbleY + bubbleH);
      ctx.lineTo(0, bubbleY + bubbleH + 4);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = player.isVerified ? '#39FF14' : 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(-5, bubbleY + bubbleH);
      ctx.lineTo(0, bubbleY + bubbleH + 4);
      ctx.lineTo(5, bubbleY + bubbleH);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
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
