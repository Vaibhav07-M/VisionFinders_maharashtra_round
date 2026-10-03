import { useState, useEffect, useCallback } from 'react';
import { socket } from '@/utils/socket';

interface ClockState {
  offset: number; // serverTime + rtt/2 - localTime
  lastSyncedAt: number;
  rtt: number;
  fakedClientSkewMs: number; // Dev setting to simulate device clock skew
}

// Global singleton clock state so all components and hooks share the exact same synchronized time
let globalClockState: ClockState = {
  offset: 0,
  lastSyncedAt: 0,
  rtt: 0,
  fakedClientSkewMs: 0,
};

const listeners = new Set<(state: ClockState) => void>();

function notifyListeners() {
  listeners.forEach(fn => fn({ ...globalClockState }));
}

// Helper to simulate a skewed local client clock (for testing Section 7)
function getClientNow(): number {
  return Date.now() + globalClockState.fakedClientSkewMs;
}

// Perform 3-sample NTP-like synchronization with lowest RTT
export async function sampleServerTime(): Promise<ClockState> {
  const samples: Array<{ offset: number; rtt: number }> = [];

  for (let i = 0; i < 3; i++) {
    try {
      const tStart = getClientNow();
      const res = await fetch('/api/time', { cache: 'no-store' });
      const data = await res.json();
      const tEnd = getClientNow();
      const rtt = Math.max(0, tEnd - tStart);
      const serverTime = Number(data.serverTime);

      // Standard NTP formula: server offset = serverTime + (rtt / 2) - tEnd
      const sampleOffset = serverTime + (rtt / 2) - tEnd;
      samples.push({ offset: sampleOffset, rtt });
    } catch (_) {
      // Continue to next sample
    }
  }

  if (samples.length > 0) {
    // Pick the sample with the lowest round-trip latency
    samples.sort((a, b) => a.rtt - b.rtt);
    const best = samples[0];
    globalClockState = {
      ...globalClockState,
      offset: best.offset,
      rtt: best.rtt,
      lastSyncedAt: Date.now(),
    };
    notifyListeners();
  }

  return { ...globalClockState };
}

// Automatically sync on initial load
if (typeof window !== 'undefined') {
  sampleServerTime();

  // Re-sync every 30 seconds
  setInterval(() => {
    sampleServerTime();
  }, 30000);

  // Sync on Socket.io connect and reconnect
  socket.on('connect', () => {
    sampleServerTime();
  });

  socket.on('time:sync', (data: { serverTime: number }) => {
    if (data?.serverTime) {
      const localNow = getClientNow();
      const newOffset = data.serverTime - localNow;
      // Smoothly update offset
      globalClockState = {
        ...globalClockState,
        offset: newOffset,
        lastSyncedAt: Date.now(),
      };
      notifyListeners();
    }
  });
}

export function useServerClock() {
  const [clock, setClock] = useState<ClockState>(() => ({ ...globalClockState }));

  useEffect(() => {
    listeners.add(setClock);
    return () => {
      listeners.delete(setClock);
    };
  }, []);

  // Returns synchronized current server time in milliseconds
  const now = useCallback((): number => {
    return getClientNow() + clock.offset;
  }, [clock.offset]);

  // Dev-only helper to simulate local device clock drift (e.g. +10 minutes)
  const setFakedClockSkewMinutes = useCallback((minutes: number) => {
    globalClockState.fakedClientSkewMs = minutes * 60 * 1000;
    // Resample with new client skew to prove offset cancels it out perfectly!
    sampleServerTime();
  }, []);

  return {
    now,
    serverTimeMs: now(),
    offsetMs: clock.offset,
    rttMs: clock.rtt,
    lastSyncedAt: clock.lastSyncedAt,
    fakedSkewMinutes: Math.round(globalClockState.fakedClientSkewMs / (60 * 1000)),
    setFakedClockSkewMinutes,
    resync: sampleServerTime,
  };
}
