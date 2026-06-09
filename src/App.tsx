import React, { useEffect, useState } from 'react';
import { ProtestCanvas } from './components/ProtestCanvas';
import { FeedPanel } from './components/FeedPanel';
import { NetworkFlow } from './components/NetworkFlow';
import { nostrService } from './services/nostrService';
import { initNostrKeys } from './utils/nostr';
import { finishEmailSignIn, sendMagicLink } from './utils/firebase';
import { useStore } from './store';

function App() {
  const { userProfile, currentSquare, setUserProfile } = useStore();
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [email, setEmail] = useState('');
  const [authStatus, setAuthStatus] = useState('');

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
    <div className="w-full h-screen bg-dark relative overflow-hidden font-sans text-white">
      {/* 360도 무한 캔버스 (배경) */}
      <ProtestCanvas />

      {/* 오버레이 패널들 */}
      <FeedPanel />
      <NetworkFlow />

      {/* 중앙 하단: 유저 상태 및 인증 버튼 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass-panel px-6 py-3 flex items-center gap-4 z-20">
        <div className="text-sm">
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
            className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded transition-colors border border-white/20"
          >
            대학생 인증하기
          </button>
        )}
      </div>

      {/* 면책 조항 모달 */}
      {showDisclaimer && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="glass-panel p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-neon-pink mb-4">면책 조항 및 이용 약관</h2>
            <div className="text-sm text-gray-300 space-y-4 mb-6 leading-relaxed">
              <p>본 광장은 중앙 서버에 데이터를 저장하지 않는 탈중앙화 뷰어(Viewer)입니다.</p>
              <p>타인의 명예를 훼손하거나 불법적인 발언을 할 경우 모든 민형사상 책임은 발언자 본인에게 있습니다.</p>
              <p>플랫폼은 신고가 누적된 사용자의 노출을 프론트엔드에서 즉시 차단합니다.</p>
            </div>
            <button 
              onClick={() => setShowDisclaimer(false)}
              className="w-full bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue border border-neon-blue/50 py-3 rounded-lg font-bold transition-all"
            >
              동의하고 입장하기
            </button>
          </div>
        </div>
      )}

      {/* 대학 인증 모달 */}
      {showAuthModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center animate-fade-in">
          <div className="glass-panel p-8 max-w-md w-full relative">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold text-neon-green mb-2">대학생 인증</h2>
            <p className="text-xs text-gray-400 mb-6">인증 정보는 서버에 저장되지 않으며, 암호학적 보증서로만 변환됩니다.</p>
            
            <form onSubmit={handleSendLink} className="space-y-4">
              <input 
                type="email" 
                placeholder="대학교 이메일 (@snu.ac.kr 등)" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-black/60 border border-white/20 rounded-lg py-3 px-4 text-sm text-white focus:outline-none focus:border-neon-green"
              />
              <button 
                type="submit"
                className="w-full bg-neon-green/20 hover:bg-neon-green/30 text-neon-green border border-neon-green/50 py-3 rounded-lg font-bold transition-all"
              >
                인증 링크 받기
              </button>
            </form>
            {authStatus && (
              <p className="mt-4 text-sm text-center text-neon-blue">{authStatus}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
