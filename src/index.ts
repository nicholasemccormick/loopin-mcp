#!/usr/bin/env node
// v1.0.1 - force redeploy
// ─────────────────────────────────────────────────────────────────────────────
// LoopIn MCP Server — entry point
//
// Exposes all LoopIn tools over stdio or HTTP/StreamableHTTP.
// Configure via environment variables:
//   LOOPIN_API_URL  — base URL of the LoopIn API  (default: http://localhost:3002)
//   LOOPIN_API_KEY  — API key for X-API-Key header (optional)
//   TRANSPORT       — 'stdio' (default) or 'http'
//   PORT            — HTTP port when TRANSPORT=http  (default: 3000)
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import { Server }               from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express                           from 'express';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';

import { tools, handleTool } from './tools/index';

const TOOL_NAMES = new Set(tools.map(t => t.name));

// ── Server factory ────────────────────────────────────────────────────────────

function createServer(): Server {
  const server = new Server(
    { name: 'mcp-loopin', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const { name, arguments: rawArgs } = request.params;
    const args = (rawArgs ?? {}) as Record<string, unknown>;

    if (!TOOL_NAMES.has(name)) {
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }

    try {
      const result = await handleTool(name, args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text', text: `Error calling ${name}: ${message}` }], isError: true };
    }
  });

  return server;
}

// ── Start ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transportMode = process.env['TRANSPORT'] ?? 'stdio';

  if (transportMode === 'http') {
    const app  = express();
    const port = process.env['PORT'] ?? '3000';

    app.use(express.json());

    app.post('/mcp', async (req, res) => {
      const server    = createServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });

    app.get('/mcp', (_req, res) => {
      res.status(405).json({ error: 'Method not allowed. Use POST for MCP.' });
    });

    app.delete('/mcp', (_req, res) => {
      res.status(200).json({ message: 'Session deleted' });
    });

    app.get('/health', (_req, res) => {
      res.json({ status: 'ok', service: 'loopin-mcp' });
    });

    app.get('/.well-known/mcp/server-card.json', (_req, res) => {
      res.json({
        serverInfo: { name: 'LoopIn', version: '1.0.0' },
        authentication: { required: false },
        tools: tools.map(t => ({ name: t.name, description: t.description })),
        resources: [],
        prompts: [],
      });
    });

    app.listen(Number(port), () => {
      process.stderr.write(`LoopIn MCP HTTP server running on port ${port}\n`);
    });
  } else {
    const server    = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write('mcp-loopin running\n');
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
