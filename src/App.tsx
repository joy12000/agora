import React, { useEffect, useState } from 'react';
import { ProtestCanvas } from './components/ProtestCanvas';
import { FeedPanel } from './components/FeedPanel';
import { NetworkFlow } from './components/NetworkFlow';
import { nostrService } from './services/nostrService';
import { initNostrKeys } from './utils/nostr';
import { finishEmailSignIn, sendMagicLink } from './utils/firebase';
import { useStore } from './store';
import { getThemeByHour, type TimeTheme } from './utils/theme';

function App() {
  const { userProfile, currentSquare, setUserProfile } = useStore();
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [email, setEmail] = useState('');
  const [authStatus, setAuthStatus] = useState('');
  const [timeTheme, setTimeTheme] = useState<TimeTheme>(() => getThemeByHour(new Date().getHours()));
  const [formattedTime, setFormattedTime] = useState('');

  useEffect(() => {
    const updateTimeAndTheme = () => {
      const now = new Date();
      const hour = now.getHours();
      const min = String(now.getMinutes()).padStart(2, '0');
      setFormattedTime(`${hour}:${min}`);
      setTimeTheme(getThemeByHour(hour));
    };

    updateTimeAndTheme();
    const timer = setInterval(updateTimeAndTheme, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // 1. 임시 고유 키쌍 생성
    initNostrKeys();
    
    // 2. 릴레이 연결 및 구독
    nostrService.connect();
    nostrService.subscribeToSquare(currentSquare);

    // 3. 이메일 매직 링크로 돌아온 경우 처리
    finishEmailSignIn().then(async (user) => {
      if (user && user.email) {
        setAuthStatus('Firebase 인증 완료. 보증서 발급 중...');
        try {
          const idToken = await user.getIdToken();
          // API 호출하여 마스터 보증서(Attestation) 발급
          const res = await fetch('/api/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              pubkey: useStore.getState().userProfile.pubkey
            })
          });
          const data = await res.json();
          if (data.attestation) {
            setUserProfile({
              isVerified: true,
              university: data.university,
              attestation: data.attestation
            });
            setShowAuthModal(false);
          } else {
            setAuthStatus('보증서 발급 실패: ' + data.error);
          }
        } catch (e) {
          setAuthStatus('API 서버 연결 오류');
        }
      }
    });
  }, [currentSquare]);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.endsWith('.ac.kr') && !email.endsWith('.edu')) {
      setAuthStatus('대학교 이메일(.ac.kr, .edu)만 가능합니다.');
      return;
    }
    setAuthStatus('인증 메일 전송 중...');
    try {
      await sendMagicLink(email);
      setAuthStatus('메일이 전송되었습니다. 메일함의 링크를 클릭해주세요!');
    } catch (e: any) {
      setAuthStatus('전송 실패: ' + e.message);
    }
  };

  return (
    <div 
      className="w-full h-screen relative overflow-hidden font-sans text-white transition-all duration-[2000ms] ease-in-out"
      style={{
        backgroundColor: timeTheme.bgEnd,
        backgroundImage: `radial-gradient(circle at 50% 50%, ${timeTheme.bgStart} 0%, ${timeTheme.bgEnd} 100%)`
      }}
    >
      {/* 상단 중앙: 시간대 및 실시간 시계 배지 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-panel px-4 py-2 flex items-center gap-3 z-20 text-xs font-semibold tracking-wider animate-fade-in">
        <span className="flex items-center gap-1.5">
          <span 
            className="w-2 h-2 rounded-full animate-pulse transition-all duration-1000"
            style={{ 
              backgroundColor: timeTheme.accent, 
              boxShadow: `0 0 8px ${timeTheme.accent}` 
            }}
          />
          {timeTheme.label}
        </span>
        <span className="w-[1px] h-3 bg-white/10" />
        <span className="text-gray-400 font-mono">{formattedTime}</span>
      </div>

      {/* 360도 무한 캔버스 (배경) */}
      <ProtestCanvas timeTheme={timeTheme} />

      {/* 오버레이 패널들 */}
      <FeedPanel />
      <NetworkFlow />

      {/* 중앙 하단: 유저 상태 및 인증 버튼 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass-panel px-4 md:px-6 py-2.5 md:py-3 flex items-center gap-3 md:gap-4 z-20 text-xs md:text-sm whitespace-nowrap">
        <div>
          {userProfile.isVerified ? (
            <span className="text-neon-green flex items-center gap-2 font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
              </span>
              🎓 {userProfile.university} 인증됨
            </span>
          ) : (
            <span className="text-gray-400">비인증 시민 (익명)</span>
          )}
        </div>
        {!userProfile.isVerified && (
          <button 
            onClick={() => setShowAuthModal(true)}
            className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded transition-colors border border-white/20 cursor-pointer"
          >
            대학생 인증하기
          </button>
        )}
      </div>

      {/* 면책 조항 모달 */}
      {showDisclaimer && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in p-4">
          <div className="bg-[#fdfbf7] text-[#4a2c00] border-4 border-[#8c6239] shadow-2xl rounded-2xl p-6 md:p-8 max-w-lg w-full transform transition-all text-left">
            <div className="flex items-center gap-2 mb-4 justify-center">
              <span className="text-2xl">🏡</span>
              <h2 className="text-xl md:text-2xl font-bold text-[#8c6239]">가상 광장 이용 약관</h2>
            </div>
            <div className="text-sm text-[#5c4d3c] space-y-4 mb-6 leading-relaxed bg-[#f5ede0] p-4 rounded-xl border border-[#8c6239]/15">
              <p>🌱 본 광장은 중앙 서버에 개인 데이터를 일절 저장하지 않는 탈중앙화 뷰어(Viewer)입니다.</p>
              <p>🔒 모든 발언은 Nostr 릴레이 네트워크를 통해 암호화 서명 후 중계되며, 타인의 명예를 훼손하거나 불법적인 발언을 할 경우 모든 법적 책임은 발언자 본인에게 있습니다.</p>
              <p>🛡️ 커뮤니티 정화 시스템에 의해 신고가 10회 이상 접수된 사용자의 글은 화면에서 즉시 차단(블라인드) 처리됩니다.</p>
            </div>
            <button 
              onClick={() => setShowDisclaimer(false)}
              className="w-full bg-[#2b9348] hover:bg-[#207c3b] text-white py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.98] border-b-4 border-[#1e6631] cursor-pointer"
            >
              약관에 동의하고 공원 입장하기
            </button>
          </div>
        </div>
      )}

      {/* 대학 인증 모달 */}
      {showAuthModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-40 flex items-center justify-center animate-fade-in p-4">
          <div className="bg-[#fdfbf7] text-[#4a2c00] border-4 border-[#8c6239] shadow-2xl rounded-2xl p-6 md:p-8 max-w-md w-full relative transform transition-all text-left">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-[#4a2c00] transition-colors font-bold text-lg cursor-pointer"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🎓</span>
              <h2 className="text-lg md:text-xl font-bold text-[#2b9348]">대학생 인증하기</h2>
            </div>
            <p className="text-xs text-[#8c6239] mb-5">인증 정보는 서버에 저장되지 않고 브라우저에 임시 암호학적 보증서로만 변환되어 안전하게 적용됩니다.</p>
            
            <form onSubmit={handleSendLink} className="space-y-4">
              <input 
                type="email" 
                placeholder="대학교 이메일 (@snu.ac.kr 등)" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white border-2 border-[#8c6239]/20 rounded-xl py-3 px-4 text-sm text-[#4a2c00] placeholder:text-[#8c6239]/40 focus:outline-none focus:border-[#2b9348] transition-all"
              />
              <button 
                type="submit"
                className="w-full bg-[#d4a373] hover:bg-[#c39262] text-white py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.98] border-b-4 border-[#b78453] cursor-pointer"
              >
                인증 링크 이메일 받기
              </button>
            </form>
            {authStatus && (
              <p className="mt-4 text-xs text-center text-[#4a90e2] font-semibold font-mono bg-[#4a90e2]/5 py-2 rounded-lg border border-[#4a90e2]/15">{authStatus}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
