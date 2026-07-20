import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { Plugin } from './types.js';

const PERMS_DIR = join(homedir(), '.config', 'lunira');
const PERMS_FILE = join(PERMS_DIR, 'permissions.json');

interface PermissionsStore {
  granted: string[];
}

function load(): Set<string> {
  try {
    const raw = readFileSync(PERMS_FILE, 'utf-8');
    const store = JSON.parse(raw) as PermissionsStore;
    return new Set(Array.isArray(store.granted) ? store.granted : []);
  } catch {
    return new Set();
  }
}

function save(granted: Set<string>): void {
  mkdirSync(PERMS_DIR, { recursive: true });
  writeFileSync(PERMS_FILE, JSON.stringify({ granted: [...granted] }, null, 2), 'utf-8');
}

export function isPermitted(plugin: Plugin): boolean {
  if (plugin.tier === 'safe') return true;
  return load().has(plugin.id);
}

export function grantPermission(pluginId: string): void {
  const granted = load();
  granted.add(pluginId);
  save(granted);
}

export function revokePermission(pluginId: string): void {
  const granted = load();
  granted.delete(pluginId);
  save(granted);
}

export function listGranted(): string[] {
  return [...load()];
}
