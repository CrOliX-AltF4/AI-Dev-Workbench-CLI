import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, writeFile, readdir, unlink } from 'node:fs/promises';
import type { POOutput } from '../agents/types.js';

const RECOVERY_DIR = join(homedir(), '.lunira', 'recovery');
const MAX_RECOVERY_FILES = 10;

async function ensureDir(): Promise<void> {
  await mkdir(RECOVERY_DIR, { recursive: true });
}

export async function saveRecovery(po: POOutput, intent: string): Promise<string> {
  await ensureDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}.json`;
  const filePath = join(RECOVERY_DIR, filename);

  await writeFile(filePath, JSON.stringify({ ...po, _intent: intent }, null, 2), 'utf8');

  // Prune oldest files beyond MAX_RECOVERY_FILES
  try {
    const files = (await readdir(RECOVERY_DIR))
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse();
    for (const old of files.slice(MAX_RECOVERY_FILES)) {
      await unlink(join(RECOVERY_DIR, old)).catch(() => undefined);
    }
  } catch {
    // best-effort
  }

  return filePath;
}
