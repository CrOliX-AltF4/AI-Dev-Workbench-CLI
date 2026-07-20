#!/usr/bin/env node

// Load .env from the current working directory before anything else.
// getApiKey() reads process.env, so dotenv vars are picked up automatically.
import 'dotenv/config';

import { Command } from 'commander';
import packageJson from '../../package.json';
import { runCommand } from './commands/run.js';
import { historyCommand } from './commands/history.js';
import { setupCommand } from './commands/setup.js';
import { configCommand } from './commands/config.js';
import { initCommand } from './commands/init.js';
import { catalogCommand } from './commands/catalog.js';
import { watchCommand } from './commands/watch.js';
import { askCommand } from './commands/ask.js';
import { welcomeCommand } from './commands/welcome.js';
import { listConfiguredProviders } from '../providers/config.js';
import { costsCommand } from './commands/costs.js';

const { version } = packageJson;

const program = new Command();

program
  .name('lunira')
  .description("Lun'Ira — multi-agent AI development pipeline CLI")
  .version(version);

// ─── run ──────────────────────────────────────────────────────────────────────

program
  .command('run [intent]')
  .description('Run a development pipeline from a user intent')
  .option('--json', 'headless mode: write JSON result to stdout, progress to stderr')
  .option('--skip <roles>', 'comma-separated roles to skip: po, planner, dev, qa')
  .option('--dry', 'preview models and estimated cost without running')
  .option(
    '--from-po <source>',
    'inject PO output JSON from a file or stdin ("-"); auto-skips PO agent',
  )
  .option('--output <dir>', 'write Dev-generated files to this directory after the run')
  .option('--apply', 'write Dev-generated files to the current directory (headless)')
  .option(
    '--file <path>',
    'inject file content into PO context (repeatable)',
    (v: string, acc: string[]) => [...acc, v],
    [] as string[],
  )
  .option('--workspace', 'inject cwd, package.json and git status into the PO context')
  .option('--model <id>', 'override model ID for all agents (e.g. gemini-2.5-pro)')
  .option(
    '--provider <name>',
    'override provider for all agents: groq | gemini | claude | openai | nim',
  )
  .option('--budget-usd <max>', 'abort pipeline if total cost exceeds this USD amount', parseFloat)
  .option(
    '--daily-budget-usd <max>',
    'abort if cumulative spend today exceeds this amount',
    parseFloat,
  )
  .option('--max-iterations <n>', 'max Dev→QA retry iterations on QA fail (default: 2)', (v) =>
    parseInt(v, 10),
  )
  .option(
    '--plan-review',
    'pause after Planner and require human approval before Dev runs (headless mode only)',
  )
  .option('--no-banner', 'suppress the startup banner (also: LUNIRA_NO_BANNER=1)')
  .action(
    async (
      intent?: string,
      opts?: {
        json?: boolean;
        skip?: string;
        dry?: boolean;
        fromPo?: string;
        output?: string;
        apply?: boolean;
        file?: string[];
        workspace?: boolean;
        model?: string;
        provider?: string;
        budgetUsd?: number;
        dailyBudgetUsd?: number;
        maxIterations?: number;
        planReview?: boolean;
        noBanner?: boolean;
      },
    ) => {
      await runCommand({
        ...(intent ? { intent } : {}),
        ...(opts?.json ? { json: true } : {}),
        ...(opts?.skip ? { skip: opts.skip } : {}),
        ...(opts?.dry ? { dry: true } : {}),
        ...(opts?.fromPo ? { fromPo: opts.fromPo } : {}),
        ...(opts?.output ? { output: opts.output } : {}),
        ...(opts?.apply ? { apply: true } : {}),
        ...(opts?.file && opts.file.length > 0 ? { file: opts.file } : {}),
        ...(opts?.workspace ? { workspace: true } : {}),
        ...(opts?.model ? { model: opts.model } : {}),
        ...(opts?.provider ? { provider: opts.provider } : {}),
        ...(opts?.budgetUsd !== undefined ? { budgetUsd: opts.budgetUsd } : {}),
        ...(opts?.dailyBudgetUsd !== undefined ? { dailyBudgetUsd: opts.dailyBudgetUsd } : {}),
        ...(opts?.maxIterations !== undefined ? { maxIterations: opts.maxIterations } : {}),
        ...(opts?.planReview ? { planReview: true } : {}),
        ...(opts?.noBanner ? { noBanner: true } : {}),
      });
    },
  );

// ─── history ──────────────────────────────────────────────────────────────────

program
  .command('history')
  .description(
    'List previous pipeline runs (interactive TUI; use --json for machine-readable output)',
  )
  .option('--json', 'output runs as JSON array instead of launching the TUI')
  .option('--limit <n>', 'max runs to show in --json mode (default: 20)', (v) => parseInt(v, 10))
  .action(async (opts?: { json?: boolean; limit?: number }) => {
    await historyCommand({
      ...(opts?.json ? { json: true } : {}),
      ...(opts?.limit !== undefined ? { limit: opts.limit } : {}),
    });
  });

// ─── setup ────────────────────────────────────────────────────────────────────

program
  .command('setup')
  .description('Configure LLM provider API keys interactively')
  .action(async () => {
    await setupCommand();
  });

// ─── config ───────────────────────────────────────────────────────────────────

program
  .command('config <action> [key] [value]')
  .description('Manage configuration: get/set/unset <provider>.apiKey, list')
  .action((action: string, key?: string, value?: string) => {
    // "list" needs no key; all others require one
    if (action !== 'list' && !key) {
      console.error(
        `Key is required for action "${action}". Example: lunira config ${action} groq.apiKey`,
      );
      process.exit(1);
    }
    configCommand(action, key ?? '', value);
  });

// ─── init ─────────────────────────────────────────────────────────────────────

program
  .command('init')
  .description('Scaffold a new project with lunira conventions')
  .option('-n, --name <name>', 'project name (lowercase, hyphens)')
  .option('-t, --type <type>', 'project type: frontend | fullstack | cli | lib')
  .option('--skip-install', 'skip npm install after scaffolding')
  .option('--dir <path>', 'target directory (defaults to ./<name>)')
  .action(async (opts: { name?: string; type?: string; skipInstall?: boolean; dir?: string }) => {
    await initCommand(opts);
  });

// ─── catalog ──────────────────────────────────────────────────────────────────

program
  .command('catalog')
  .description('List all built-in and installed skills and plugins')
  .action(() => {
    catalogCommand();
  });

// ─── install ──────────────────────────────────────────────────────────────────

program
  .command('install <type> <name>')
  .description('install a skill or plugin from npm (lunira-skill-* / lunira-plugin-*)')
  .action(async (type: string, name: string) => {
    const { installCommand } = await import('./commands/install.js');
    installCommand(type, name);
  });

// ─── costs ────────────────────────────────────────────────────────────────────

program
  .command('costs')
  .description('Show cost summary from run history')
  .option('--days <n>', 'rolling window in days (default: 7)', (v) => parseInt(v, 10))
  .option('--json', 'output as JSON')
  .action(async (opts?: { days?: number; json?: boolean }) => {
    await costsCommand({
      ...(opts?.days !== undefined ? { days: opts.days } : {}),
      ...(opts?.json ? { json: true } : {}),
    });
  });

// ─── watch ────────────────────────────────────────────────────────────────────

program
  .command('watch <path>')
  .description('Watch a path and re-run the pipeline automatically on file changes')
  .option('--intent <file>', 'read intent from this file on each run')
  .option('--debounce <ms>', 'debounce delay in ms (default: 500)', (v) => parseInt(v, 10))
  .action(async (watchPath: string, opts?: { intent?: string; debounce?: number }) => {
    await watchCommand(watchPath, {
      ...(opts?.intent !== undefined ? { intent: opts.intent } : {}),
      ...(opts?.debounce !== undefined ? { debounce: opts.debounce } : {}),
    });
  });

// ─── ask ──────────────────────────────────────────────────────────────────────

program
  .command('ask <prompt>')
  .description('Ask a question directly to the configured LLM (no pipeline)')
  .option(
    '--file <path>',
    'inject file content into context (repeatable)',
    (v: string, acc: string[]) => [...acc, v],
    [] as string[],
  )
  .option(
    '--provider <name>',
    'override provider: groq | gemini | claude | openai | nim | openrouter | ollama',
  )
  .option('--model <id>', 'override model ID')
  .action(async (prompt: string, opts: { file?: string[]; provider?: string; model?: string }) => {
    await askCommand(prompt, {
      ...(opts.file && opts.file.length > 0 ? { file: opts.file } : {}),
      ...(opts.provider ? { provider: opts.provider } : {}),
      ...(opts.model ? { model: opts.model } : {}),
    });
  });

// ─── Default: open prompt screen ─────────────────────────────────────────────

if (process.argv.length <= 2) {
  if (listConfiguredProviders().length === 0) {
    await welcomeCommand();
  } else {
    await runCommand({});
  }
} else {
  program.parse();
}
