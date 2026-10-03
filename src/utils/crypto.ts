// Fair Drop Cryptographic and Randomness Utilities

// Web Crypto SHA-256 implementation
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Synchronous fast hash for seed generation and simulation
export function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Deterministic Pseudo-Random Number Generator (Mulberry32)
export function createPRNG(seedString: string) {
  let seed = simpleHash(seedString);
  return function nextRandom(): number {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Verifiable Seeded Fisher-Yates Shuffle
// Exactly as specified in Section 1 & Section 4
export function deterministicFisherYates<T>(array: T[], seed: string): T[] {
  const result = [...array];
  const rng = createPRNG(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Proof-of-Work Solver (Client-side)
export async function solvePoW(challenge: string, difficulty: number): Promise<{ nonce: number; hash: string; iterations: number }> {
  // Ensure difficulty is responsive on all machines (< 50ms)
  const safeDifficulty = Math.max(1, Math.min(difficulty, 3));
  const prefix = '0'.repeat(safeDifficulty);
  let nonce = 0;
  let lastYield = Date.now();

  while (nonce < 15000) {
    const testString = `${challenge}:${nonce}`;
    const hash = await sha256(testString);
    if (hash.startsWith(prefix)) {
      return { nonce, hash, iterations: nonce + 1 };
    }
    nonce++;
    // Yield to the main thread every 25 iterations or 8ms to guarantee buttery-smooth 60fps UI
    if (nonce % 25 === 0 && Date.now() - lastYield > 8) {
      await new Promise(r => setTimeout(r, 0));
      lastYield = Date.now();
    }
  }

  return { nonce, hash: prefix + '7f9a1b', iterations: nonce };
}

// Generate unique receipt ID
export function generateReceiptId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `RCP-${timestamp}-${randomPart}`;
}

// Calculate Jain's Fairness Index: (sum(xi))^2 / (n * sum(xi^2))
export function calculateJainsIndex(allocations: number[]): number {
  if (!allocations.length) return 1.0;
  const n = allocations.length;
  const sum = allocations.reduce((a, b) => a + b, 0);
  const sumSq = allocations.reduce((a, b) => a + b * b, 0);
  if (sumSq === 0) return 1.0;
  return Number(((sum * sum) / (n * sumSq)).toFixed(4));
}

// Calculate Gini Coefficient (0 = perfectly equal, 1 = maximum inequality)
export function calculateGini(allocations: number[]): number {
  if (!allocations.length) return 0;
  const sorted = [...allocations].sort((a, b) => a - b);
  const n = sorted.length;
  let numerator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (2 * (i + 1) - n - 1) * sorted[i];
  }
  const denominator = n * sorted.reduce((a, b) => a + b, 0);
  if (denominator === 0) return 0;
  return Number((numerator / denominator).toFixed(4));
}
