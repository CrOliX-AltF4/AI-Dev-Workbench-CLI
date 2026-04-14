#!/usr/bin/env node

import { Command } from 'commander';
import { runCommand } from './commands/run.js';
import { historyCommand } from './commands/history.js';
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
  .action(async (intent?: string) => {
    await runCommand(intent ? { intent } : {});
  });

// ─── history ──────────────────────────────────────────────────────────────────

program
  .command('history')
  .description('List previous pipeline runs')
  .action(() => {
    historyCommand();
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
