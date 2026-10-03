import {
  Drop,
  DropEntry,
  Seat,
  Reservation,
  Ticket,
  Appeal,
  AuditRecord,
  SimulationConfig,
  SimulationTrialResult,
  FairnessComparisonReport,
  UserProfile,
  UserRole,
} from '@shared/types';
import { SecurityConfig } from '../../server/modules/abuse';

// Relative API client ensuring zero hardcoded localhost URLs
const API_BASE = '/api';

export function getAdminHeaders(): Record<string, string> {
  const sessionId = localStorage.getItem('fairdrop_session_id') || 'sess_user_marcus_organizer';
  const userJson = localStorage.getItem('fairdrop_user');
  const persona = localStorage.getItem('fairdrop_persona');
  let user: UserProfile | null = null;
  try {
    user = userJson ? JSON.parse(userJson) : null;
  } catch (_) {}

  // Determine admin role and credentials
  let role: UserRole = 'organizer';
  let uid = 'user_marcus_organizer';
  let email = 'marcus.v@festivalgroup.com';

  if (user && ['organizer', 'security', 'evaluator', 'readonly'].includes(user.role)) {
    role = user.role;
    uid = user.uid;
    email = user.email;
  } else if (persona === 'security') {
    role = 'security';
    uid = 'user_dr_elena_sec';
    email = 'elena.rostova@fairdrop.io';
  } else if (persona === 'evaluator') {
    role = 'evaluator';
    uid = 'user_prof_arun_eval';
    email = 'arun.patel@securitybench.org';
  }

  const effectiveSession = sessionId || `sess_${uid}`;

  return {
    'Content-Type': 'application/json',
    'x-session-id': effectiveSession,
    'Authorization': `Bearer ${effectiveSession}`,
    'x-user-uid': uid,
    'x-user-role': role,
    'x-user-email': email,
  };
}

function getAuthHeaders(): Record<string, string> {
  const sessionId = localStorage.getItem('fairdrop_session_id') || '';
  const userJson = localStorage.getItem('fairdrop_user');
  let user: UserProfile | null = null;
  try {
    user = userJson ? JSON.parse(userJson) : null;
  } catch (_) {}

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (sessionId) {
    headers['x-session-id'] = sessionId;
    headers['Authorization'] = `Bearer ${sessionId}`;
  }
  if (user) {
    headers['x-user-uid'] = user.uid;
    headers['x-user-role'] = user.role;
    headers['x-user-email'] = user.email;
  }

  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body.error || body.message) {
        errMessage = body.message || body.error;
      }
    } catch (_) {}
    throw new Error(errMessage);
  }

  return response.json();
}

export const api = {
  // Authentication & Session
  auth: {
    signup: (data: { email: string; password: string; displayName?: string; role?: UserRole; phone?: string }) =>
      request<{ success: boolean; user: UserProfile; sessionId: string }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      request<{ success: boolean; user: UserProfile; sessionId: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    personaLogin: (personaKey: 'attendee' | 'organizer' | 'security' | 'evaluator') =>
      request<{ success: boolean; user: UserProfile; sessionId: string }>('/auth/persona-login', {
        method: 'POST',
        body: JSON.stringify({ personaKey }),
      }),
    getMe: () => request<{ user: UserProfile }>('/auth/me'),
  },

  // Identity & OTP
  identity: {
    sendOtp: (phone: string) =>
      request<{ success: boolean; message: string; simulatedCode?: string; expiresInSec: number }>('/identity/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),
    verifyOtp: (phone: string, code: string) =>
      request<{ success: boolean; identityKey: string; verified: boolean; message: string }>('/identity/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      }),
  },

  // Synchronized Clock
  time: {
    get: () => request<{ serverTime: number }>('/time'),
  },

  // Drops
  drops: {
    list: () => request<{ drops: Drop[] }>('/drops'),
    get: (id: string) => request<{ drop: Drop }>(`/drops/${id}`),
    getBoard: (id: string) => request<{ board: import('@shared/types').LiveBoardData }>(`/drops/${id}/board`),
    getMe: (id: string) => request<import('@shared/types').UserDropState>(`/drops/${id}/me`),
    updatePreferences: (id: string, preferences: string[]) =>
      request<{ success: boolean; entry: DropEntry }>(`/drops/${id}/preferences`, {
        method: 'PUT',
        body: JSON.stringify({ preferences }),
      }),
    leaveWaitlist: (id: string) =>
      request<{ success: boolean; message: string }>(`/drops/${id}/waitlist/leave`, {
        method: 'POST',
      }),
    nextRound: (id: string) =>
      request<{ success: boolean; drop: Drop; availableSeats: number }>(`/admin/drops/${id}/next-round`, {
        method: 'POST',
      }),
    create: (data: Partial<Drop>) =>
      request<{ drop: Drop }>('/drops', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, updates: Partial<Drop>) =>
      request<{ success: boolean; drop: Drop }>(`/drops/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    getSeats: (id: string) => request<{ seats: Seat[]; count: number }>(`/drops/${id}/seats`),
    getEntries: (id: string) => request<{ entries: DropEntry[]; count: number }>(`/drops/${id}/entries`),
    updateEntryStatus: (id: string, identityKey: string, status: string, riskScore?: number) =>
      request<{ success: boolean; entry: DropEntry }>(`/drops/${id}/entries/${identityKey}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, riskScore }),
      }),
  },

  // 5-Minute Offers & Real Cascade
  offers: {
    pay: (offerId: string) =>
      request<{ success: boolean; ticket: Ticket; isDuplicate?: boolean }>(`/offers/${offerId}/pay`, {
        method: 'POST',
      }),
    release: (offerId: string) =>
      request<{ success: boolean; message: string; cascaded?: boolean }>(`/offers/${offerId}/release`, {
        method: 'POST',
      }),
  },

  // Entry & Registration
  entry: {
    join: (dropId: string, payload: {
      nonce?: number;
      idempotencyKey?: string;
      website_trap?: string;
      preferences?: string[];
      isBot?: boolean;
      speedClass?: string;
    }) =>
      request<{ isDuplicate: boolean; entry: DropEntry; message?: string }>(`/drops/${dropId}/join`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getMe: (dropId: string) => request<{ entry: DropEntry | null; reservation: Reservation | null }>(`/drops/${dropId}/entries/me`),
  },

  // Draw Execution
  draw: {
    trigger: (dropId: string) =>
      request<{
        success: boolean;
        dropId: string;
        revealedSeed: string;
        winnersCount: number;
        drawState: any;
        invariants: any;
      }>(`/drops/${dropId}/draw`, {
        method: 'POST',
      }),
  },

  // Checkout & Tickets
  checkout: {
    purchase: (payload: { dropId: string; seatId: string; paymentMethod: string; idempotencyKey?: string }) =>
      request<{ success: boolean; ticket: Ticket }>('/checkout', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getMyTickets: () => request<{ tickets: Ticket[]; count: number }>('/tickets/me'),
  },

  // Appeals
  appeals: {
    list: () => request<{ appeals: Appeal[]; count: number }>('/appeals'),
    create: (data: { dropId: string; reason: string; entryId?: string }) =>
      request<{ success: boolean; appeal: Appeal }>('/appeals', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    decide: (id: string, status: 'approved' | 'rejected', notes?: string) =>
      request<{ success: boolean; appeal: Appeal }>(`/appeals/${id}/decide`, {
        method: 'POST',
        body: JSON.stringify({ status, notes }),
      }),
  },

  // Security Rules
  security: {
    getRules: () => request<{ config: SecurityConfig }>('/security/rules'),
    updateRules: (updates: Partial<SecurityConfig>) =>
      request<{ success: boolean; config: SecurityConfig; message: string }>('/security/rules', {
        method: 'POST',
        body: JSON.stringify(updates),
      }),
  },

  // Simulation Lab
  simulation: {
    run: (config: SimulationConfig) =>
      request<{ trial: SimulationTrialResult; comparison: FairnessComparisonReport }>('/simulation/run', {
        method: 'POST',
        body: JSON.stringify(config),
      }),
    getLatest: () => request<{ report: FairnessComparisonReport }>('/simulation/latest'),
    getRuns: () => request<{ runs: FairnessComparisonReport[]; count: number }>('/simulation/runs'),
    getMatrix: () => request<{ matrix: any[]; count: number }>('/simulation/matrix'),
  },

  // Audit Log & Invariants
  audit: {
    list: () => request<{ records: AuditRecord[]; count: number }>('/audit'),
    verify: () => request<{ isValid: boolean; brokenIndex?: number; count: number; message: string }>('/audit/verify', {
      method: 'POST',
    }),
  },

  invariants: {
    check: (dropId: string) => request<{
      dropId: string;
      oversold: number;
      duplicates: number;
      orphanedHolds: number;
      inventoryConsistent: boolean;
      valid: boolean;
      seatsSummary: { total: number; available: number; held: number; sold: number };
      entriesSummary: { total: number; selected: number; flagged: number; eligible: number };
    }>(`/invariants/${dropId}`),
  },

  // Chaos Injection
  chaos: {
    inject: (type: 'kill' | 'latency' | 'cache' | 'disconnect') =>
      request<{ success: boolean; message: string }>('/chaos/inject', {
        method: 'POST',
        body: JSON.stringify({ type }),
      }),
  },

  // Demo Reset
  demo: {
    reset: () => request<{ success: boolean; message: string }>('/demo/reset', { method: 'POST' }),
  },
};
