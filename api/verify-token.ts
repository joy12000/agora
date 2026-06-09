import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as jose from 'jose';

// 이 환경 변수들은 Vercel 대시보드에 설정되어야 합니다.
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'online-protest-plaza';
const MASTER_SECRET_KEY = process.env.MASTER_SECRET_KEY || 'very_secret_master_key_for_dev_only';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { idToken, pubkey } = req.body;

  if (!idToken || !pubkey) {
    return res.status(400).json({ error: 'Missing idToken or pubkey' });
  }

  try {
    // 1. Google Firebase Auth 공개키 가져오기
    const JWKS = jose.createRemoteJWKSet(new URL('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'));

    // 2. JWT 서명 검증
    const { payload } = await jose.jwtVerify(idToken, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });

    const email = payload.email as string;
    
    // 3. 대학 도메인 검증
    if (!email || (!email.endsWith('.ac.kr') && !email.endsWith('.edu'))) {
      return res.status(403).json({ error: 'Not a valid university email' });
    }

    const domainParts = email.split('@');
    const universityDomain = domainParts[domainParts.length - 1];

    // 4. 마스터 키로 암호학적 보증서(Attestation) 서명
    const secret = new TextEncoder().encode(MASTER_SECRET_KEY);
    const alg = 'HS256';
    
    const attestationJwt = await new jose.SignJWT({ 
      pubkey: pubkey,
      university: universityDomain,
      verified: true 
    })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime('1y') // 1년간 유효한 보증서
      .sign(secret);

    // 5. 성공 응답
    return res.status(200).json({ 
      success: true, 
      university: universityDomain,
      attestation: attestationJwt 
    });

  } catch (error: any) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}
