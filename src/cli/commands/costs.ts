import { listRuns } from '../../storage/index.js';
import type { PipelineRun } from '../../types/index.js';

// ─── Aggregation helpers ───────────────────────────────────────────────────────

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

interface ProviderTotals {
  spentUsd: number;
  tokens: number;
  runs: number;
}

function aggregate(runs: PipelineRun[]): Map<string, ProviderTotals> {
  const map = new Map<string, ProviderTotals>();
  for (const run of runs) {
    for (const step of run.steps) {
      if (!step.provider || step.status !== 'completed') continue;
      const key = step.provider;
      const entry = map.get(key) ?? { spentUsd: 0, tokens: 0, runs: 0 };
      entry.spentUsd += step.costUsd ?? 0;
      entry.tokens += step.tokensUsed ?? 0;
      map.set(key, entry);
    }
    // Count the run once under its first active provider
    const firstProvider = run.steps.find((s) => s.provider && s.status === 'completed')?.provider;
    if (firstProvider) {
      const entry = map.get(firstProvider);
      if (entry) entry.runs += 1;
    }
  }
  return map;
}

function formatUsd(n: number): string {
  return n < 0.001 ? `$${(n * 1000).toFixed(3)}m` : `$${n.toFixed(4)}`;
}

// ─── Display ──────────────────────────────────────────────────────────────────

export async function costsCommand(opts: { days?: number; json?: boolean }): Promise<void> {
  const allRuns = await listRuns();
  const windowDays = opts.days ?? 7;
  const cutoff = daysAgo(windowDays);
  const today = startOfDay(new Date());

  const windowRuns = allRuns.filter((r) => new Date(r.createdAt) >= cutoff);
  const todayRuns = allRuns.filter((r) => new Date(r.createdAt) >= today);

  if (opts.json) {
    const out = {
      today: {
        spentUsd: todayRuns.reduce((s, r) => s + r.totalCostUsd, 0),
        tokens: todayRuns.reduce((s, r) => s + r.totalTokens, 0),
        runs: todayRuns.length,
      },
      window: {
        days: windowDays,
        spentUsd: windowRuns.reduce((s, r) => s + r.totalCostUsd, 0),
        tokens: windowRuns.reduce((s, r) => s + r.totalTokens, 0),
        runs: windowRuns.length,
        byProvider: Object.fromEntries(aggregate(windowRuns)),
      },
    };
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    return;
  }

  const todaySpend = todayRuns.reduce((s, r) => s + r.totalCostUsd, 0);
  const todayTokens = todayRuns.reduce((s, r) => s + r.totalTokens, 0);
  const windowSpend = windowRuns.reduce((s, r) => s + r.totalCostUsd, 0);
  const byProvider = aggregate(windowRuns);

  const pad = (s: string, n: number) => s.padEnd(n);
  const COL = { provider: 14, runs: 8, tokens: 14, cost: 12 };

  process.stdout.write('\nlunira — cost summary\n\n');

  process.stdout.write(
    `  Today          ${formatUsd(todaySpend).padStart(10)}   ${todayTokens.toLocaleString()} tok   ${todayRuns.length.toString()} run(s)\n`,
  );
  process.stdout.write(
    `  Last ${windowDays.toString()} days    ${formatUsd(windowSpend).padStart(10)}   ${windowRuns.reduce((s, r) => s + r.totalTokens, 0).toLocaleString()} tok   ${windowRuns.length.toString()} run(s)\n`,
  );

  if (byProvider.size > 0) {
    process.stdout.write('\n');
    process.stdout.write(
      `  ${pad('Provider', COL.provider)}${pad('Runs', COL.runs)}${pad('Tokens', COL.tokens)}Cost\n`,
    );
    process.stdout.write(`  ${'─'.repeat(COL.provider + COL.runs + COL.tokens + COL.cost)}\n`);

    for (const [provider, totals] of [...byProvider.entries()].sort(
      (a, b) => b[1].spentUsd - a[1].spentUsd,
    )) {
      process.stdout.write(
        `  ${pad(provider, COL.provider)}${pad(totals.runs.toString(), COL.runs)}${pad(totals.tokens.toLocaleString(), COL.tokens)}${formatUsd(totals.spentUsd)}\n`,
      );
    }
  }

  process.stdout.write('\n');
}

// ─── Today's spend (for daily-budget check) ───────────────────────────────────

export async function getTodaySpend(): Promise<number> {
  const runs = await listRuns();
  const today = startOfDay(new Date());
  return runs.filter((r) => new Date(r.createdAt) >= today).reduce((s, r) => s + r.totalCostUsd, 0);
}
