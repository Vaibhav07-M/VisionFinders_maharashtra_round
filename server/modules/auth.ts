import { Request, Response, NextFunction } from 'express';
import { db, sha256Sync } from '../db/firestore';
import { UserRole, UserProfile } from '../../shared/types';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: UserRole;
    displayName: string;
    phone?: string;
    phoneVerified: boolean;
    sessionId?: string;
  };
}

export function hashPassword(password: string): string {
  return sha256Sync(`${password}_fairdrop_salt_2026`);
}

// Session Creation in Firestore collection 'sessions'
export function createSession(uid: string, deviceId = 'web_client', ip = '127.0.0.1'): string {
  const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  const ipHash = sha256Sync(ip);
  db.set('sessions', sessionId, {
    sessionId,
    uid,
    deviceId,
    ipHash,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
  });
  return sessionId;
}

// Auth Middleware: Verifies Session or Auth Headers
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const sessionId = (req.headers['x-session-id'] as string) || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined);
  const roleHeader = (req.headers['x-user-role'] as UserRole) || 'attendee';
  const uidHeader = (req.headers['x-user-uid'] as string) || 'user_alex_77';
  const emailHeader = (req.headers['x-user-email'] as string) || 'alex.chen@fairdrop.io';

  let authenticatedUser: any = null;

  // Check server-side session doc in Firestore if provided
  if (sessionId) {
    const sessionDoc = db.get('sessions', sessionId);
    if (sessionDoc) {
      db.set('sessions', sessionId, { ...sessionDoc.data, lastSeenAt: Date.now() });
      const userDoc = db.get('users', sessionDoc.data.uid);
      if (userDoc) {
        authenticatedUser = userDoc.data;
      }
    }
  }

  // Fallback to user by UID header or seed default
  if (!authenticatedUser) {
    const userDoc = db.get('users', uidHeader);
    if (userDoc) {
      authenticatedUser = userDoc.data;
    } else {
      authenticatedUser = {
        uid: uidHeader,
        email: emailHeader,
        displayName: 'Demo User',
        role: roleHeader,
        phone: '+1 (555) 382-9901',
        phoneVerified: true,
      };
    }
  }

  req.user = {
    uid: authenticatedUser.uid,
    email: authenticatedUser.email,
    displayName: authenticatedUser.displayName || 'Demo User',
    role: authenticatedUser.role || roleHeader,
    phone: authenticatedUser.phone,
    phoneVerified: authenticatedUser.phoneVerified !== false,
    sessionId: sessionId || `sess_${authenticatedUser.uid}`,
  };

  next();
}

// Role Guard Middleware
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `Action requires one of the following roles: [${allowedRoles.join(', ')}]. Current role: ${req.user?.role}`,
      });
    }
    next();
  };
}

// POST /api/auth/signup
export function signupHandler(req: Request, res: Response) {
  const { email, password, displayName, role = 'attendee', phone } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  // Check if user already exists
  const existingUsers = db.list('users').map(d => d.data);
  const found = existingUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (found) {
    return res.status(409).json({ error: 'USER_EXISTS', message: 'An account with this email already exists.' });
  }

  const uid = `user_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const passwordHash = hashPassword(password);
  const newUser = {
    uid,
    email: email.toLowerCase(),
    displayName: displayName || email.split('@')[0],
    role: role as UserRole,
    phone: phone || '',
    phoneVerified: false,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  db.set('users', uid, newUser);
  const sessionId = createSession(uid);

  const { passwordHash: _, ...safeUser } = newUser;
  return res.status(201).json({
    success: true,
    user: safeUser,
    sessionId,
  });
}

// POST /api/auth/login
export function loginHandler(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const existingUsers = db.list('users').map(d => d.data);
  const user = existingUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
  }

  const expectedHash = hashPassword(password);
  if (user.passwordHash && user.passwordHash !== expectedHash) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
  }

  const sessionId = createSession(user.uid);
  const { passwordHash: _, ...safeUser } = user;
  return res.json({
    success: true,
    user: safeUser,
    sessionId,
  });
}

// POST /api/auth/persona-login
// 1-Click Persona Login backed by real seeded users in Firestore
export function personaLoginHandler(req: Request, res: Response) {
  const { personaKey } = req.body;
  const personaUidMap: Record<string, string> = {
    attendee: 'user_alex_77',
    organizer: 'user_marcus_organizer',
    security: 'user_dr_elena_sec',
    evaluator: 'user_prof_arun_eval',
  };

  const targetUid = personaUidMap[personaKey] || 'user_alex_77';
  let userDoc = db.get('users', targetUid);

  if (!userDoc) {
    // Return persona default and persist it
    const defaultProfiles: Record<string, any> = {
      attendee: {
        uid: 'user_alex_77',
        email: 'alex.chen@fairdrop.io',
        displayName: 'Alex Chen',
        role: 'attendee',
        phone: '+1 (555) 382-9901',
        phoneVerified: true,
      },
      organizer: {
        uid: 'user_marcus_organizer',
        email: 'marcus.v@festivalgroup.com',
        displayName: 'Marcus Vance',
        role: 'organizer',
        phone: '+1 (555) 441-2099',
        phoneVerified: true,
      },
      security: {
        uid: 'user_dr_elena_sec',
        email: 'elena.rostova@fairdrop.io',
        displayName: 'Dr. Elena Rostova',
        role: 'security',
        phone: '+1 (555) 890-1122',
        phoneVerified: true,
      },
      evaluator: {
        uid: 'user_prof_arun_eval',
        email: 'arun.patel@securitybench.org',
        displayName: 'Prof. Arun Patel',
        role: 'evaluator',
        phone: '+1 (555) 773-4500',
        phoneVerified: true,
      },
    };
    const profile = defaultProfiles[personaKey] || defaultProfiles.attendee;
    userDoc = db.set('users', profile.uid, profile);
  }

  const user = userDoc.data;
  const sessionId = createSession(user.uid);
  const { passwordHash: _, ...safeUser } = user;

  return res.json({
    success: true,
    user: safeUser,
    sessionId,
  });
}

// GET /api/auth/me
export function getCurrentUserHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHENTICATED' });
  }
  const userDoc = db.get('users', req.user.uid);
  if (userDoc) {
    const { passwordHash: _, ...safeUser } = userDoc.data;
    return res.json({ user: safeUser });
  }
  return res.json({ user: req.user });
}
