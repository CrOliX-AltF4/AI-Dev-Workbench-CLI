#!/usr/bin/env node

// Load .env from the current working directory before anything else.
// getApiKey() reads process.env, so dotenv vars are picked up automatically.
import 'dotenv/config';

import { Command } from 'commander';
import { runCommand } from './commands/run.js';
import { historyCommand } from './commands/history.js';
import { setupCommand } from './commands/setup.js';
import { configCommand } from './commands/config.js';

const program = new Command();

program
  .name('aiwb')
  .description('AI Dev Workbench — AI-powered development orchestration CLI')
  .version('0.1.0');

// ─── run ──────────────────────────────────────────────────────────────────────

program
  .command('run [intent]')
  .description('Run a development pipeline from a user intent')
  .option('--json', 'headless mode: write JSON result to stdout, progress to stderr')
  .action(async (intent?: string, opts?: { json?: boolean }) => {
    await runCommand({ ...(intent ? { intent } : {}), ...(opts?.json ? { json: true } : {}) });
  });

// ─── history ──────────────────────────────────────────────────────────────────

program
  .command('history')
  .description('List previous pipeline runs')
  .action(async () => {
    await historyCommand();
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
        `Key is required for action "${action}". Example: aiwb config ${action} groq.apiKey`,
      );
      process.exit(1);
    }
    configCommand(action, key ?? '', value);
  });

// ─── Default: open prompt screen ─────────────────────────────────────────────

if (process.argv.length <= 2) {
  await runCommand({});
} else {
  program.parse();
}
