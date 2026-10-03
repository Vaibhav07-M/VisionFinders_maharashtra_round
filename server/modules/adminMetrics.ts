// Server-side Real-time Metrics Ring Buffer
// Tracks requests, 429 rate limits, and latency per second across a 5-minute sliding window (300 buckets).
// NO Math.random: all data originates from real HTTP middleware telemetry.

export interface SecondBucket {
  second: number; // Unix timestamp in seconds
  totalRequests: number;
  rateLimited429: number;
  latencies: number[];
}

export class AdminMetricsTracker {
  private readonly WINDOW_SECONDS = 300; // 5 minutes
  private buckets: Map<number, SecondBucket> = new Map();

  constructor() {
    // Initialise empty ring buffer for the past 300 seconds so charts have complete time series
    const currentSec = Math.floor(Date.now() / 1000);
    for (let i = this.WINDOW_SECONDS - 1; i >= 0; i--) {
      const sec = currentSec - i;
      this.buckets.set(sec, {
        second: sec,
        totalRequests: 0,
        rateLimited429: 0,
        latencies: [],
      });
    }

    // Clean up old buckets periodically (every 10s)
    setInterval(() => this.pruneOldBuckets(), 10000).unref();
  }

  public recordRequest(statusCode: number, latencyMs: number): void {
    const currentSec = Math.floor(Date.now() / 1000);
    let bucket = this.buckets.get(currentSec);
    if (!bucket) {
      bucket = {
        second: currentSec,
        totalRequests: 0,
        rateLimited429: 0,
        latencies: [],
      };
      this.buckets.set(currentSec, bucket);
    }

    bucket.totalRequests++;
    if (statusCode === 429) {
      bucket.rateLimited429++;
    }
    bucket.latencies.push(Math.round(latencyMs));
    // Keep max 50 latencies per second bucket to bound memory
    if (bucket.latencies.length > 50) {
      bucket.latencies.shift();
    }
  }

  public record(latencyMs: number, statusCode = 200): void {
    this.recordRequest(statusCode, latencyMs);
  }

  private pruneOldBuckets(): void {
    const thresholdSec = Math.floor(Date.now() / 1000) - this.WINDOW_SECONDS;
    for (const [sec] of this.buckets) {
      if (sec < thresholdSec) {
        this.buckets.delete(sec);
      }
    }
  }

  public getHistory(durationSeconds: number = 300): Array<{
    timestamp: number;
    timeLabel: string;
    totalRequests: number;
    rateLimited429: number;
    p95Latency: number;
  }> {
    const nowSec = Math.floor(Date.now() / 1000);
    const windowStart = nowSec - Math.min(durationSeconds, this.WINDOW_SECONDS) + 1;
    const result: Array<{
      timestamp: number;
      timeLabel: string;
      totalRequests: number;
      rateLimited429: number;
      p95Latency: number;
    }> = [];

    for (let sec = windowStart; sec <= nowSec; sec++) {
      const bucket = this.buckets.get(sec) || {
        second: sec,
        totalRequests: 0,
        rateLimited429: 0,
        latencies: [],
      };

      const d = new Date(sec * 1000);
      const timeLabel = `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
      
      let p95 = 0;
      if (bucket.latencies.length > 0) {
        const sorted = [...bucket.latencies].sort((a, b) => a - b);
        const p95Idx = Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1);
        p95 = sorted[p95Idx];
      }

      result.push({
        timestamp: sec * 1000,
        timeLabel,
        totalRequests: bucket.totalRequests,
        rateLimited429: bucket.rateLimited429,
        p95Latency: p95,
      });
    }

    return result;
  }

  public getSummary(): {
    currentRps: number;
    current429Rate: number;
    p95Latency: number;
    totalRequestsLast60s: number;
    total429Last60s: number;
  } {
    const nowSec = Math.floor(Date.now() / 1000);
    const currentBucket = this.buckets.get(nowSec);
    const prevBucket = this.buckets.get(nowSec - 1);

    const latest = currentBucket && currentBucket.totalRequests > 0 ? currentBucket : prevBucket;
    const currentRps = latest ? latest.totalRequests : 0;
    const current429Rate = latest ? latest.rateLimited429 : 0;

    // Collect all latencies over the last 60 seconds
    let totalReq60 = 0;
    let total429_60 = 0;
    const allLatencies60: number[] = [];

    for (let sec = nowSec - 59; sec <= nowSec; sec++) {
      const b = this.buckets.get(sec);
      if (b) {
        totalReq60 += b.totalRequests;
        total429_60 += b.rateLimited429;
        allLatencies60.push(...b.latencies);
      }
    }

    let p95 = 0;
    if (allLatencies60.length > 0) {
      allLatencies60.sort((a, b) => a - b);
      const idx = Math.min(Math.floor(allLatencies60.length * 0.95), allLatencies60.length - 1);
      p95 = allLatencies60[idx];
    }

    return {
      currentRps,
      current429Rate,
      p95Latency: p95,
      totalRequestsLast60s: totalReq60,
      total429Last60s: total429_60,
    };
  }
}

export const adminMetrics = new AdminMetricsTracker();
