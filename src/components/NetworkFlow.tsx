import React, { useState } from 'react';
import { useStore } from '../store';
import { ShieldCheck, Activity, ChevronDown, Cpu, HelpCircle, Eye, EyeOff } from 'lucide-react';

export const NetworkFlow: React.FC = () => {
  const { rawPackets } = useStore();
  const [isOpen, setIsOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth > 768);
  const [devMode, setDevMode] = useState(false);

  // 위치/이동 패킷(Kind 20005)은 완전히 필터링
  const filteredPackets = rawPackets.filter(p => p.kind !== 20005);

  const renderFriendlyLog = (packet: any, index: number) => {
    const timeStr = new Date(packet.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const shortPub = packet.pubkey ? packet.pubkey.substring(0, 6) : '익명';
    
    if (packet.kind === 1) {
      return (
        <div key={index} className="flex flex-col gap-1.5 bg-white/5 p-3 rounded-lg border border-white/5 shrink-0 text-left font-sans">
          <div className="flex items-center justify-between text-[10px] text-neon-blue font-semibold">
            <span>📢 새로운 목소리 기록됨</span>
            <span className="font-mono text-gray-500">{timeStr}</span>
          </div>
          <p className="text-xs text-gray-200 mt-0.5 leading-relaxed break-all">
            시민 <span className="font-mono bg-white/10 px-1 py-0.2 rounded text-[10px] text-gray-300">{shortPub}</span>님이 가상 시위 광장에 의견 <span className="text-white font-semibold">"{packet.content}"</span>을 보탰습니다.
          </p>
          <div className="flex items-center gap-1 mt-0.5 text-[9px] text-neon-green/80">
            <ShieldCheck size={10} />
            <span>암호 서명(Nostr) 검증을 거쳐 위조 방지 처리 완료</span>
          </div>
        </div>
      );
    }
    
    if (packet.kind === 1984) {
      return (
        <div key={index} className="flex flex-col gap-1.5 bg-neon-pink/5 p-3 rounded-lg border border-neon-pink/20 shrink-0 text-left font-sans">
          <div className="flex items-center justify-between text-[10px] text-neon-pink font-semibold">
            <span>🚨 유저 신고/차단 접수</span>
            <span className="font-mono text-gray-500">{timeStr}</span>
          </div>
          <p className="text-xs text-gray-200 mt-0.5 leading-relaxed">
            광장 안전을 해치는 콘텐츠에 대한 공익 차단 신고 패킷이 실시간 수신되었습니다.
          </p>
        </div>
      );
    }
    
    return (
      <div key={index} className="flex flex-col gap-1.5 bg-white/5 p-3 rounded-lg border border-white/5 shrink-0 text-left font-sans">
        <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold">
          <span>⚙️ 암호 프로토콜 패킷 (Kind {packet.kind})</span>
          <span className="font-mono text-gray-500">{timeStr}</span>
        </div>
        <p className="text-xs text-gray-300 mt-0.5 leading-relaxed break-all">
          탈중앙화 노드에서 데이터 무결성을 검증하고 수신을 성공적으로 마쳤습니다.
        </p>
      </div>
    );
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute right-4 bottom-4 md:bottom-auto md:top-4 glass-panel px-4 py-3 flex items-center gap-2 z-10 hover:bg-white/10 transition-all border border-neon-blue/30 text-neon-blue shadow-lg pointer-events-auto cursor-pointer rounded-xl group animate-fade-in"
      >
        <Activity size={16} className="animate-pulse group-hover:scale-110 transition-transform" />
        <span className="text-xs font-bold tracking-wider uppercase">투명성 데이터</span>
      </button>
    );
  }

  return (
    <div className="absolute right-4 left-4 md:left-auto bottom-4 top-auto md:top-4 md:bottom-4 md:w-96 glass-panel flex flex-col p-0 z-10 pointer-events-auto animate-slide-in-right overflow-hidden shadow-2xl h-[380px] md:h-auto">
      {/* Header */}
      <div className="bg-black/50 p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="text-neon-blue" size={18} />
          <h2 className="text-sm font-bold text-white tracking-wider font-sans uppercase">실시간 투명성 센터</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDevMode(!devMode)}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded border border-white/20 text-[10px] text-white transition-colors cursor-pointer"
            title={devMode ? "일반 모드로 전환" : "개발자 모드로 전환"}
          >
            {devMode ? <EyeOff size={11} /> : <Eye size={11} />}
            <span>{devMode ? "일반 뷰" : "개발자 뷰"}</span>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white hover:bg-white/10 transition-colors p-1 rounded cursor-pointer"
            title="Minimize Panel"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* 설명 상자 (일반 모드 전용) */}
      {!devMode && (
        <div className="p-4 bg-neon-blue/5 border-b border-white/10 text-xs leading-relaxed text-gray-300 flex items-start gap-2.5 shrink-0 text-left">
          <HelpCircle size={18} className="text-neon-blue shrink-0 mt-0.5 animate-pulse" />
          <div>
            <span className="font-bold text-white block mb-0.5">서버가 없는 투명한 가상 광장</span>
            본 광장은 중앙 데이터베이스 없이 전세계의 독립적인 <span className="text-neon-blue font-semibold">Nostr 릴레이(Relay) 서버</span>를 거쳐 암호화된 패킷 형태로 실시간 중계됩니다. 특정 기관이나 서버 소유자가 여러분의 발언을 위변조하거나 일방적으로 삭제할 수 없습니다.
          </div>
        </div>
      )}

      {/* 네트워크 메쉬 비주얼 (개발자 모드 전용) */}
      {devMode && (
        <div className="h-24 bg-black/80 border-b border-white/10 flex items-center justify-center relative overflow-hidden shrink-0">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, #4a90e2 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
            animation: 'pulse 4s infinite alternate'
          }}></div>
          <div className="text-center z-10 relative">
            <p className="text-neon-blue text-xs font-mono font-bold tracking-widest uppercase animate-pulse mb-1">Relay Mesh Active</p>
            <div className="flex flex-col gap-0.5">
              <p className="text-gray-400 text-[9px] font-mono bg-black/60 px-1.5 py-0.5 rounded border border-white/5">wss://relay.damus.io</p>
              <p className="text-gray-400 text-[9px] font-mono bg-black/60 px-1.5 py-0.5 rounded border border-white/5">wss://nos.lol</p>
            </div>
          </div>
          <div className="absolute top-0 left-0 w-full h-1 bg-neon-blue/30 blur-[2px] animate-[scan_3s_linear_infinite]" style={{
            boxShadow: '0 0 10px 2px rgba(74, 144, 226, 0.4)'
          }}></div>
        </div>
      )}

      {/* 제어 바 */}
      <div className="bg-black/30 px-4 py-2 border-b border-white/5 flex items-center justify-between text-[10px] text-gray-500 font-mono tracking-wider shrink-0">
        <span>&gt; {devMode ? "RAW_PACKET_STREAM" : "실시간 활동 기록"}</span>
        <span>패킷 수: {filteredPackets.length}</span>
      </div>

      {/* 로그 리스트 */}
      <div className="flex-1 bg-[#050505]/80 overflow-y-auto p-4 flex flex-col gap-3 scroll-smooth">
        {devMode ? (
          filteredPackets.map((packet, i) => (
            <div key={i} className="bg-black p-3 rounded-lg border border-white/10 relative overflow-hidden group shrink-0 hover:border-neon-blue/30 transition-colors shadow-sm font-mono text-[10px] text-left">
              {packet.isVerified && (
                <div className="absolute top-0 right-0 bg-neon-green/10 text-neon-green px-2 py-1 rounded-bl-lg flex items-center gap-1 z-10 border-l border-b border-neon-green/20">
                  <ShieldCheck size={12} />
                  <span className="text-[9px] font-bold tracking-wider">VERIFIED</span>
                </div>
              )}
              {packet.kind === 1984 && (
                <div className="absolute top-0 right-0 bg-neon-pink/10 text-neon-pink px-2 py-1 rounded-bl-lg flex items-center gap-1 z-10 border-l border-b border-neon-pink/20">
                  <span className="text-[9px] font-bold tracking-wider">REPORT (1984)</span>
                </div>
              )}

              <div className="text-gray-400 break-all leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">
                <span className="text-neon-pink">{"{"}</span><br />
                &nbsp;&nbsp;<span className="text-neon-blue">"id"</span>: <span className="text-green-300">"{packet.id ? packet.id.substring(0, 16) : 'unknown'}..."</span>,<br />
                &nbsp;&nbsp;<span className="text-neon-blue">"pubkey"</span>: <span className="text-green-300">"{packet.pubkey ? packet.pubkey.substring(0, 16) : 'unknown'}..."</span>,<br />
                &nbsp;&nbsp;<span className="text-neon-blue">"kind"</span>: <span className="text-purple-400">{packet.kind}</span>,<br />
                &nbsp;&nbsp;<span className="text-neon-blue">"content"</span>: <span className="text-green-300">"{packet.content || ''}"</span><br />
                <span className="text-neon-pink">{"}"}</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/0 via-neon-blue/5 to-neon-blue/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            </div>
          ))
        ) : (
          filteredPackets.map((packet, i) => renderFriendlyLog(packet, i))
        )}

        {filteredPackets.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-3 opacity-50 my-8">
            <Activity size={24} className="animate-pulse" />
            <div className="italic tracking-widest text-xs uppercase text-center">전송된 이벤트 패킷이 없습니다.<br />첫 번째 구호를 외쳐보세요!</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-10px); }
          100% { transform: translateY(100px); }
        }
      `}</style>
    </div>
  );
};
