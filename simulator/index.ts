import { BotProfileType, SimulationConfig, SimulationTrialResult } from '../shared/types';

interface VirtualClient {
  id: string;
  isBot: boolean;
  profile?: BotProfileType;
  speedClass: 'fast' | 'slow';
  ip: string;
  latencyMs: number;
}

export class LoadSimulator {
  private targetUrl: string;

  constructor(targetUrl = 'http://localhost:4000') {
    // Safety check from Section 7: only target local/staged URL
    if (!targetUrl.includes('localhost') && !targetUrl.includes('127.0.0.1')) {
      throw new Error(`SAFETY_LOCK: Simulator can only target localhost or emulator. Blocked target: ${targetUrl}`);
    }
    this.targetUrl = targetUrl;
  }

  // Generates 50,000 virtual clients with realistic demographic and bot attributes
  public generateVirtualClients(config: SimulationConfig): VirtualClient[] {
    const clients: VirtualClient[] = [];
    const total = config.totalUsers;
    const botCount = Math.floor(total * (config.botSharePercentage / 100));
    const humanCount = total - botCount;

    // 1. Generate Legitimate Humans
    for (let i = 0; i < humanCount; i++) {
      const isFast = Math.random() < 0.65;
      clients.push({
        id: `human_${i}`,
        isBot: false,
        speedClass: isFast ? 'fast' : 'slow',
        ip: `172.16.${Math.floor(i / 250)}.${i % 250 + 1}`,
        latencyMs: isFast ? Math.floor(15 + Math.random() * 45) : Math.floor(250 + Math.random() * 800),
      });
    }

    // 2. Generate Automated Bots
    const profiles = config.selectedProfiles.length > 0 ? config.selectedProfiles : ['fast_single_shot'];
    for (let i = 0; i < botCount; i++) {
      const profile = profiles[i % profiles.length];
      const isProxyBotnet = profile === 'distributed_botnet';
      const ip = isProxyBotnet
        ? `198.51.${Math.floor(i / 200)}.${i % 200 + 1}`
        : `203.0.113.${(i % 10) + 1}`; // Flooder/single-shot clusters on few IPs

      clients.push({
        id: `bot_${profile}_${i}`,
        isBot: true,
        profile,
        speedClass: 'fast',
        ip,
        latencyMs: Math.floor(1 + Math.random() * 8), // Sub-millisecond bot sniper speeds
      });
    }

    // Shuffle client arrival sequence
    return clients.sort(() => Math.random() - 0.5);
  }

  // Execute Batch Simulation Run
  public async runSimulation(config: SimulationConfig): Promise<SimulationTrialResult> {
    console.log(`[SIMULATOR] Launching simulation run: "${config.scenarioName}"`);
    console.log(`[SIMULATOR] Total virtual clients: ${config.totalUsers.toLocaleString()} (${config.botSharePercentage}% bots)`);

    const clients = this.generateVirtualClients(config);
    const start = Date.now();

    // Call the server simulation endpoint
    try {
      const response = await fetch(`${this.targetUrl}/api/simulation/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      console.log(`[SIMULATOR] Simulation completed in ${Date.now() - start}ms.`);
      console.log(`[SIMULATOR] Bot Advantage Ratio: ${data.trial.botAdvantageRatio}x`);
      return data.trial;
    } catch (err: any) {
      console.error(`[SIMULATOR] Error running simulation:`, err.message);
      throw err;
    }
  }
}

// Standalone CLI execution
const sim = new LoadSimulator();
sim.runSimulation({
  scenarioName: 'CLI 50,000 Client Benchmark',
  totalUsers: 50000,
  botSharePercentage: 30,
  selectedProfiles: ['fast_single_shot', 'distributed_botnet', 'smart_bot'],
  requestsPerSecPerBot: 50,
  retriesPerBot: 5,
  ipPoolSize: 2000,
  accountsPerOperator: 15,
  mode: 'FAIR_DROP',
  trialCount: 3,
  randomSeed: 'CLI_SEED_2026',
  defences: {
    turnstileEnabled: true,
    powEnabled: true,
    powDifficulty: 4,
    honeypotEnabled: true,
    rateLimitPerIp: 15,
    rateLimitPerAccount: 30,
    rateLimitPerDevice: 30,
    timingJitterCheck: true,
    riskScoringEnabled: true,
    minRiskBlockScore: 80,
    minRiskChallengeScore: 50,
  },
});

