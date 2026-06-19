#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const server = new McpServer({ name: 'atomic-memory', version: '1.0.0' });
const REPO_ROOT = process.env.ATOMIC_SWARM_REPO_ROOT || process.cwd();
const ATOMIC_DIR = path.join(REPO_ROOT, '.atomic');
const LEDGER_FILE = path.join(ATOMIC_DIR, 'semantic-memory-ledger.jsonl');

if (!fs.existsSync(ATOMIC_DIR)) {
  fs.mkdirSync(ATOMIC_DIR, { recursive: true });
}

function ok(payload) {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

function fail(error) {
  return { content: [{ type: 'text', text: JSON.stringify({ ok: false, error: String(error) }, null, 2) }], isError: true };
}

server.registerTool(
  'memory_record',
  {
    title: 'Record a semantic memory with verifiable intent',
    description: 'Save a structural explanation of WHY a code change, task, or lock was made. This connects the append-only ledger with cognitive rationale, creating a semantic graph of the system evolution.',
    inputSchema: {
      intent: z.string().min(10),
      relatedFiles: z.array(z.string()).optional(),
      relatedTaskIds: z.array(z.number()).optional(),
      tags: z.array(z.string()).optional()
    }
  },
  async (args) => {
    try {
      const entry = {
        at: new Date().toISOString(),
        tool: 'memory_record',
        intent: args.intent,
        files: args.relatedFiles || [],
        tasks: args.relatedTaskIds || [],
        tags: args.tags || []
      };
      
      const entryStr = JSON.stringify(entry);
      const hash = crypto.createHash('sha256').update(entryStr).digest('hex');
      const finalEntry = JSON.stringify({ ...entry, hash });
      
      fs.appendFileSync(LEDGER_FILE, finalEntry + '\n');
      
      return ok({ ok: true, hash, recordedAt: entry.at });
    } catch (e) {
      return fail(e);
    }
  }
);

server.registerTool(
  'memory_query',
  {
    title: 'Query the semantic memory ledger',
    description: 'Search past intents by keyword or tag (text match).',
    inputSchema: {
      query: z.string().optional(),
      tag: z.string().optional(),
      limit: z.number().int().positive().default(50).optional()
    }
  },
  async (args) => {
    try {
      if (!fs.existsSync(LEDGER_FILE)) {
        return ok({ ok: true, results: [] });
      }
      
      const lines = fs.readFileSync(LEDGER_FILE, 'utf-8').split('\n').filter(Boolean);
      const results = [];
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          let matches = false;
          
          if (args.query && entry.intent.toLowerCase().includes(args.query.toLowerCase())) {
            matches = true;
          }
          if (args.tag && entry.tags.includes(args.tag)) {
            matches = true;
          }
          if (!args.query && !args.tag) {
            matches = true;
          }
          
          if (matches) results.push(entry);
        } catch (e) {}
      }
      
      results.sort((a, b) => new Date(b.at) - new Date(a.at));
      const limit = args.limit ?? 50;
      const capped = results.slice(0, limit);
      
      return ok({ ok: true, results: capped });
    } catch (e) {
      return fail(e);
    }
  }
);

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

run().catch(console.error);
