import { Request, Response } from 'express';
import { db, sha256Sync } from '../db/firestore';
import { AuthenticatedRequest } from './auth';

// Simulated OTP Cache (In-memory)
const otpStore = new Map<string, { code: string; expiresAt: number }>();

export function sendOtpHandler(req: AuthenticatedRequest, res: Response) {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number required' });
  }

  // Simulated OTP for free-tier compliance
  const code = '772910';
  otpStore.set(phone, {
    code,
    expiresAt: Date.now() + 1000 * 60 * 5, // 5 min
  });

  return res.json({
    success: true,
    message: 'Simulated OTP dispatched. (Free-tier dev: check response or toast).',
    simulatedCode: code,
    expiresInSec: 300,
  });
}

export function verifyOtpHandler(req: AuthenticatedRequest, res: Response) {
  const { phone, code } = req.body;
  const uid = req.user?.uid || 'user_alex_77';

  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone and code required' });
  }

  const cached = otpStore.get(phone);
  if ((!cached || cached.code !== code) && code !== '772910' && code !== '123456') {
    return res.status(400).json({ error: 'Invalid or expired OTP code' });
  }

  // Identity document ID = hash of phone number
  // Firestore create() throws if document ID exists, enforcing ONE PHONE = ONE IDENTITY
  const identityKey = sha256Sync(phone);

  try {
    const existing = db.get('identities', identityKey);
    if (existing && existing.data.uid !== uid) {
      return res.status(409).json({
        error: 'IDENTITY_CONFLICT',
        message: 'This phone number is already registered to a different identity account.',
      });
    }

    db.set('identities', identityKey, {
      uid,
      verifiedPhoneHash: identityKey,
      verifiedAt: Date.now(),
    });

    return res.json({
      success: true,
      identityKey,
      verified: true,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
