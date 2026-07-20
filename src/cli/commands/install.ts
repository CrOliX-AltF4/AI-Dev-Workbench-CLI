import { spawnSync } from 'node:child_process';

const VALID_TYPES = ['skill', 'plugin'] as const;
type InstallType = (typeof VALID_TYPES)[number];

function isValidType(type: string): type is InstallType {
  return (VALID_TYPES as readonly string[]).includes(type);
}

function packageName(type: InstallType, name: string): string {
  return `lunira-${type}-${name}`;
}

export function installCommand(type: string, name: string): void {
  if (!isValidType(type)) {
    process.stderr.write(
      `Usage: lunira install <skill|plugin> <name>\n` +
        `  lunira install skill  my-skill   → npm install -g lunira-skill-my-skill\n` +
        `  lunira install plugin my-plugin  → npm install -g lunira-plugin-my-plugin\n`,
    );
    process.exit(1);
  }

  const pkg = packageName(type, name);
  process.stdout.write(`Installing ${pkg}...\n`);

  const result = spawnSync('npm', ['install', '-g', pkg], {
    stdio: ['ignore', 'inherit', 'pipe'],
    shell: true,
  });

  if ((result.status ?? 1) !== 0) {
    if (result.stderr.length > 0) {
      process.stderr.write(result.stderr.toString());
    }
    process.stderr.write(`✗ Install failed.\n`);
    process.exit(1);
  }

  process.stdout.write(`✓ Installed.\n`);
}
