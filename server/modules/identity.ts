import { Request, Response } from 'express';
import { db, sha256Sync } from '../db/firestore';
import { AuthenticatedRequest } from './auth';

// POST /api/identity/send-otp
// Generates a 6-digit code, stores hashed code with 5-minute expiry and attempt count in Firestore
export function sendOtpHandler(req: AuthenticatedRequest, res: Response) {
  const { phone } = req.body;
  if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
    return res.status(400).json({ error: 'Valid phone number required' });
  }

  const normalizedPhone = phone.trim().replace(/[^\d+]/g, '');
  const phoneHash = sha256Sync(normalizedPhone);

  // Generate 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = sha256Sync(code);
  const now = Date.now();
  const expiresAt = now + 1000 * 60 * 5; // 5 minutes

  // Store in Firestore collection 'otps'
  db.set('otps', phoneHash, {
    phoneHash,
    codeHash,
    attempts: 0,
    expiresAt,
    createdAt: now,
  });

  return res.json({
    success: true,
    message: 'OTP dispatched successfully.',
    // Returned in dev mode for UI toast demonstration as required
    simulatedCode: code,
    expiresInSec: 300,
  });
}

// POST /api/identity/verify-otp
// Checks expiry, enforces max 5 attempts, creates identities/{hash(phone)}
export async function verifyOtpHandler(req: AuthenticatedRequest, res: Response) {
  const { phone, code } = req.body;
  const uid = req.user?.uid || 'user_alex_77';

  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone and code required' });
  }

  const normalizedPhone = phone.trim().replace(/[^\d+]/g, '');
  const phoneHash = sha256Sync(normalizedPhone);
  const now = Date.now();

  let otpDoc = db.get('otps', phoneHash);
  if (!otpDoc && db.isCloudEnabled()) {
    otpDoc = await db.getCloudDoc('otps', phoneHash);
  }
  if (!otpDoc) {
    return res.status(400).json({ error: 'No active OTP found. Please request a new code.' });
  }

  const otp = otpDoc.data;

  // Check Expiry
  if (now > otp.expiresAt) {
    db.delete('otps', phoneHash);
    return res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
  }

  // Check Attempt Count (max 5 attempts)
  if (otp.attempts >= 5) {
    db.delete('otps', phoneHash);
    return res.status(403).json({ error: 'Maximum verification attempts (5) exceeded. Please request a new code.' });
  }

  // Verify Code Hash
  const inputHash = sha256Sync(code.trim());
  if (inputHash !== otp.codeHash) {
    const newAttempts = otp.attempts + 1;
    if (newAttempts >= 5) {
      db.delete('otps', phoneHash);
      return res.status(403).json({
        error: 'MAX_ATTEMPTS_EXCEEDED',
        message: 'Maximum verification attempts (5) exceeded. Please request a new code.',
      });
    }
    // Increment attempts count
    db.set('otps', phoneHash, { ...otp, attempts: newAttempts });
    const remaining = 5 - newAttempts;
    return res.status(400).json({
      error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    });
  }

  // Check if identity already exists (Document ID = hash(phone))
  // Firestore doc ID uniqueness guarantees 1 phone = 1 identity
  try {
    const existingIdentity = db.get('identities', phoneHash);
    if (existingIdentity && existingIdentity.data.uid !== uid) {
      return res.status(409).json({
        error: 'IDENTITY_CONFLICT',
        message: 'This phone number has already been registered to an identity.',
      });
    }

    db.set('identities', phoneHash, {
      uid,
      verifiedPhoneHash: phoneHash,
      phoneMasked: `${normalizedPhone.slice(0, 3)}••••${normalizedPhone.slice(-4)}`,
      verifiedAt: now,
    });

    // Clean up OTP record
    db.delete('otps', phoneHash);

    return res.json({
      success: true,
      identityKey: phoneHash,
      verified: true,
      message: 'Identity verified successfully.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
