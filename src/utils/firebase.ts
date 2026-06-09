import { initializeApp } from 'firebase/app';
import { getAuth, isSignInWithEmailLink, signInWithEmailLink, sendSignInLinkToEmail } from 'firebase/auth';

// TODO: 환경 변수에서 가져오도록 변경해야 합니다.
// 개발 및 시연을 위한 임시/플레이스홀더 설정
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSy_MOCK_API_KEY_FOR_DEV",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "online-protest-plaza.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "online-protest-plaza",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "online-protest-plaza.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const sendMagicLink = async (email: string) => {
  const actionCodeSettings = {
    // 배포 후에는 실제 도메인으로 변경해야 합니다. (개발 중에는 localhost)
    url: window.location.href,
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  window.localStorage.setItem('emailForSignIn', email);
};

export const finishEmailSignIn = async () => {
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
      email = window.prompt('보안을 위해 이메일을 다시 입력해 주세요.');
    }
    if (email) {
      const result = await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem('emailForSignIn');
      return result.user;
    }
  }
  return null;
};
