import type { Plugin } from '../types.js';
import type { McpServerConfig } from '../../config/types.js';
import { loadMcpServer } from './mcp-adapter.js';

export async function loadMcpPlugins(servers: Record<string, McpServerConfig>): Promise<Plugin[]> {
  const results = await Promise.allSettled(
    Object.entries(servers).map(([name, cfg]) => loadMcpServer(name, cfg)),
  );

  const plugins: Plugin[] = [];
  for (const [i, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      plugins.push(...result.value);
    } else {
      const name = Object.keys(servers)[i] ?? '?';
      console.warn(`[lunira] MCP server "${name}" failed to load:`, result.reason);
    }
  }
  return plugins;
}
