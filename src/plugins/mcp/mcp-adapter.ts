import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { Plugin } from '../types.js';
import type { McpServerConfig } from '../../config/types.js';

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: number;
  result?: unknown;
  error?: { code: number; message: string };
}

interface ToolsListResult {
  tools: McpTool[];
}

interface ToolCallResult {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

class McpClient {
  private readonly pending = new Map<number, (r: JsonRpcResponse) => void>();
  private nextId = 1;
  private stdin: NodeJS.WritableStream | null = null;
  private childProcess: ReturnType<typeof spawn> | null = null;

  constructor(
    private readonly command: string,
    private readonly args: string[],
    private readonly env?: Record<string, string>,
  ) {}

  connect(): void {
    const child = spawn(this.command, this.args, {
      env: { ...process.env, ...this.env },
      stdio: ['pipe', 'pipe', 'ignore'],
      shell: false,
    });

    this.childProcess = child;
    this.stdin = child.stdin;

    const rl = createInterface({ input: child.stdout });
    rl.on('line', (line: string) => {
      if (!line.trim()) return;
      try {
        const msg = JSON.parse(line) as JsonRpcResponse;
        if (msg.id !== undefined) {
          const resolve = this.pending.get(msg.id);
          if (resolve) {
            this.pending.delete(msg.id);
            resolve(msg);
          }
        }
      } catch {
        // ignore non-JSON output (MCP server debug logs, etc.)
      }
    });
  }

  private write(msg: object): void {
    this.stdin?.write(JSON.stringify(msg) + '\n');
  }

  private async request<T>(method: string, params: object = {}): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP request "${method}" timed out`));
      }, 10_000);

      this.pending.set(id, (response) => {
        clearTimeout(timeout);
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result as T);
        }
      });
      this.write({ jsonrpc: '2.0', id, method, params });
    });
  }

  async initialize(): Promise<void> {
    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'lunira', version: '1.0.1' },
    });
    this.write({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} });
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this.request<ToolsListResult>('tools/list', {});
    return result.tools;
  }

  async callTool(name: string, args: unknown): Promise<string> {
    const result = await this.request<ToolCallResult>('tools/call', {
      name,
      arguments: args,
    });
    return result.content
      .filter((c) => c.type === 'text' && c.text)
      .map((c) => c.text)
      .join('\n');
  }

  kill(): void {
    try {
      this.childProcess?.kill();
    } catch {
      // already dead
    }
  }
}

export async function loadMcpServer(
  serverName: string,
  config: McpServerConfig,
): Promise<Plugin[]> {
  const client = new McpClient(config.command, config.args ?? [], config.env);

  try {
    client.connect();
    await client.initialize();
    const tools = await client.listTools();

    return tools.map(
      (tool): Plugin => ({
        id: `mcp__${serverName}__${tool.name}`,
        name: `${tool.name} (${serverName})`,
        description: tool.description ?? `MCP tool ${tool.name} from server ${serverName}`,
        role: config.role ?? 'all',
        tier: 'restricted' as const,
        tool: {
          name: `mcp__${serverName}__${tool.name}`,
          description: tool.description ?? `MCP tool ${tool.name}`,
          inputSchema: tool.inputSchema ?? { type: 'object', properties: {}, required: [] },
        },
        async handler(input: unknown): Promise<string> {
          return client.callTool(tool.name, input);
        },
      }),
    );
  } catch (err) {
    client.kill();
    throw err;
  }
}
