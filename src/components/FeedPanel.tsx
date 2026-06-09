import React, { useState } from 'react';
import { useStore } from '../store';
import { createChantEvent, createReportEvent } from '../utils/nostr';
import { nostrService } from '../services/nostrService';
import { Send, AlertTriangle, Hash, ChevronDown, MessageSquare, X } from 'lucide-react';

const TRENDING_SQUARES = ['광화문광장', '서울광장', '청계광장', '여의도공원', '올림픽공원'];

export const FeedPanel: React.FC = () => {
  const { currentSquare, setSquare, chants, userProfile, activeUsers } = useStore();
  const [inputText, setInputText] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  // 실시간 참여자 수 계산 (현재 유저 + 패킷을 주고받은 활성 유저 집계)
  const activeUsersCount = new Set([
    ...(userProfile.pubkey ? [userProfile.pubkey] : []),
    ...Array.from(activeUsers),
    ...chants.map(c => c.pubkey)
  ]).size;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      const event = createChantEvent(inputText, currentSquare);
      
      useStore.getState().addRawPacket({
        ...event,
        isVerified: true,
      });

      useStore.getState().addChant({
        id: event.id,
        pubkey: event.pubkey,
        content: event.content,
        timestamp: event.created_at,
        isVerified: userProfile.isVerified,
        university: userProfile.university || undefined
      });

      const success = await nostrService.publish(event);
      if (success) {
        setInputText('');
      } else {
        alert('구호 전송에 실패했습니다. 연결을 확인하세요.');
      }
    } catch (e) {
      console.error(e);
      alert('전송 중 오류가 발생했습니다.');
    }
  };

  const handleReport = async (targetPubkey: string) => {
    if (!window.confirm('이 사용자를 신고하시겠습니까? 누적 10회 이상 시 블라인드 처리됩니다.')) return;
    
    try {
      const event = createReportEvent(targetPubkey);
      await nostrService.publish(event);
      alert('신고 패킷이 네트워크에 전송되었습니다.');
    } catch (e) {
      console.error(e);
      alert('신고 전송 중 오류가 발생했습니다.');
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute left-4 top-4 glass-panel px-5 py-3 flex items-center gap-3 z-10 hover:bg-white/10 transition-all border border-[#8c6239]/30 text-[#8c6239] shadow-md pointer-events-auto cursor-pointer rounded-xl group animate-fade-in"
      >
        <MessageSquare size={18} className="group-hover:scale-110 transition-transform" />
        <span className="text-xs font-bold tracking-wider font-sans uppercase">광장 피드</span>
      </button>
    );
  }

  return (
    <div className="absolute left-4 right-4 md:right-auto top-4 bottom-4 md:w-80 glass-panel flex flex-col z-10 animate-slide-in-right p-0 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/10 bg-black/40 relative">
        <div className="flex items-center justify-between gap-2">
          <div 
            className="flex items-center gap-2 cursor-pointer group flex-1"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <Hash className="text-neon-green shrink-0" size={24} />
            <h1 className="text-xl font-bold text-white group-hover:text-neon-green transition-colors truncate">
              {currentSquare}
            </h1>
            <ChevronDown className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''} shrink-0`} size={16} />
          </div>
          
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white hover:bg-white/10 transition-colors p-1.5 rounded shrink-0"
            title="Minimize Panel"
          >
            <X size={16} />
          </button>
        </div>
        
        {isDropdownOpen && (
          <div className="absolute top-full left-0 w-full bg-black/90 border-b border-white/10 z-20 backdrop-blur-md animate-fade-in shadow-2xl">
            {TRENDING_SQUARES.map(sq => (
              <div 
                key={sq}
                className="px-5 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer flex items-center gap-2"
                onClick={() => {
                  setSquare(sq);
                  setIsDropdownOpen(false);
                  nostrService.subscribeToSquare(sq);
                }}
              >
                <Hash size={14} className={sq === currentSquare ? "text-neon-green" : "text-gray-500"} />
                {sq}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
            </span>
          </div>
          <p className="text-gray-400 text-xs font-mono tracking-wider">
            LIVE USERS: <span className="text-neon-green font-bold">{activeUsersCount}</span>
          </p>
        </div>
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scroll-smooth">
        {chants.map((chant) => (
          <div key={chant.id} className="group flex flex-col gap-1.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 font-mono bg-black/50 px-1.5 py-0.5 rounded">
                  {chant.pubkey.substring(0, 8)}
                </span>
                {chant.isVerified && chant.university && (
                  <span className="text-[10px] bg-neon-green/10 text-neon-green px-1.5 py-0.5 rounded border border-neon-green/20">
                    🎓 {chant.university}
                  </span>
                )}
              </div>
              
              {/* Report Button */}
              {chant.pubkey !== userProfile.pubkey && (
                <button 
                  onClick={() => handleReport(chant.pubkey)}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-neon-pink transition-all p-1"
                  title="신고하기"
                >
                  <AlertTriangle size={12} />
                </button>
              )}
            </div>
            <div className="bg-white/5 p-3 rounded-lg border border-white/5 group-hover:border-white/10 transition-colors shadow-sm text-sm text-gray-200 leading-relaxed break-words">
              {chant.content}
            </div>
          </div>
        ))}
        {chants.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2">
            <div className="animate-bounce">📢</div>
            <p className="text-xs">첫 번째 목소리를 내어주세요</p>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-white/10 bg-black/40">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={userProfile.privkey ? "당신의 목소리를 내세요..." : "키를 발급중입니다..."}
            disabled={!userProfile.privkey}
            className="w-full bg-black/60 border border-white/10 rounded-lg py-3 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-neon-green focus:shadow-[0_0_15px_rgba(57,255,20,0.15)] transition-all placeholder:text-gray-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-neon-green hover:text-white disabled:opacity-30 disabled:hover:text-neon-green transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
