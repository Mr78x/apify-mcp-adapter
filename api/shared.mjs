import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const APIFY_URL = process.env.APIFY_MCP_URL || 'https://mcp.apify.com';
const APIFY_TOKEN = (process.env.APIFY_TOKEN || '').trim();   // ← no hard throw here
const APIFY_TOOLS = (process.env.APIFY_TOOLS || 'docs').split(',');

function ensureToken() {
  if (!APIFY_TOKEN) throw new Error('Missing APIFY_TOKEN');
}

async function withApify(fn) {
  ensureToken(); // ← only check when actually calling Apify
  const transport = new StreamableHTTPClientTransport(APIFY_URL, {
    headers: { Authorization: `Bearer ${APIFY_TOKEN}` },
  });
  const client = new Client(transport);
  await client.connect();
  try { return await fn(client); } finally { await client.close(); }
}

async function docsSearch(client, query, topK = 8) {
  const tools = await client.listTools();
  const searchTool = tools.tools.find(t => t.name === 'search-apify-docs');
  if (!searchTool) throw new Error("Upstream tool 'search-apify-docs' not found");
  return client.callTool('search-apify-docs', { query, topK, tools: APIFY_TOOLS });
}

async function docsFetch(client, ids) {
  const tools = await client.listTools();
  const fetchTool = tools.tools.find(t => t.name === 'fetch-apify-docs');
  if (!fetchTool) throw new Error("Upstream tool 'fetch-apify-docs' not found");
  return client.callTool('fetch-apify-docs', { ids });
}

export const server = new McpServer({ name: 'apify-mcp-adapter', version: '1.0.0' });

server.tool('search', {
  type: 'object',
  properties: { query: { type: 'string' }, topK: { type: 'number' }, traceId: { type: 'string' } },
  required: ['query'],
}, async ({ query, topK = 8, traceId }) => {
  const data = await withApify(c => docsSearch(c, query, topK));
  const hits = Array.isArray(data?.content) ? data.content : [];
  const items = hits.map(h => ({ id: h?.id || h?.url, title: h?.title, url: h?.url, snippet: h?.snippet, score: h?.score })).filter(x => x?.url);
  const objectIds = items.map(x => x.url);
  return { content: [{ type: 'json', data: { objectIds, items, traceId } }] };
});

server.tool('fetch', {
  type: 'object',
  properties: { objectIds: { type: 'array', items: { type: 'string' } }, traceId: { type: 'string' } },
  required: ['objectIds'],
}, async ({ objectIds, traceId }) => {
  const data = await withApify(c => docsFetch(c, objectIds));
  const docs = Array.isArray(data?.content) ? data.content : [];
  const documents = docs.map(d => ({ id: d?.id || d?.url, url: d?.url, title: d?.title, content: d?.content || d?.text || '' })).filter(x => x?.url);
  return { content: [{ type: 'json', data: { documents, traceId } }] };
});

export const transport = new StreamableHTTPServerTransport({ path: '/messages/' });
```js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const APIFY_URL = process.env.APIFY_MCP_URL || 'https://mcp.apify.com';
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_TOOLS = (process.env.APIFY_TOOLS || 'docs').split(',');

if (!APIFY_TOKEN) throw new Error('Missing APIFY_TOKEN');

async function withApify(fn) {
  const transport = new StreamableHTTPClientTransport(APIFY_URL, {
    headers: { Authorization: `Bearer ${APIFY_TOKEN}` },
  });
  const client = new Client(transport);
  await client.connect();
  try { return await fn(client); } finally { await client.close(); }
}

async function docsSearch(client, query, topK = 8) {
  const tools = await client.listTools();
  const searchTool = tools.tools.find(t => t.name === 'search-apify-docs');
  if (!searchTool) throw new Error("Upstream tool 'search-apify-docs' not found");
  return client.callTool('search-apify-docs', { query, topK, tools: APIFY_TOOLS });
}

async function docsFetch(client, ids) {
  const tools = await client.listTools();
  const fetchTool = tools.tools.find(t => t.name === 'fetch-apify-docs');
  if (!fetchTool) throw new Error("Upstream tool 'fetch-apify-docs' not found");
  return client.callTool('fetch-apify-docs', { ids });
}

export const server = new McpServer({ name: 'apify-mcp-adapter', version: '1.0.0' });

server.tool('search', {
  type: 'object',
  properties: { query: { type: 'string' }, topK: { type: 'number' }, traceId: { type: 'string' } },
  required: ['query'],
}, async ({ query, topK = 8, traceId }) => {
  const data = await withApify(c => docsSearch(c, query, topK));
  const hits = Array.isArray(data?.content) ? data.content : [];
  const items = hits.map(h => ({ id: h?.id || h?.url, title: h?.title, url: h?.url, snippet: h?.snippet, score: h?.score })).filter(x => x?.url);
  const objectIds = items.map(x => x.url);
  return { content: [{ type: 'json', data: { objectIds, items, traceId } }] };
});

server.tool('fetch', {
  type: 'object',
  properties: { objectIds: { type: 'array', items: { type: 'string' } }, traceId: { type: 'string' } },
  required: ['objectIds'],
}, async ({ objectIds, traceId }) => {
  const data = await withApify(c => docsFetch(c, objectIds));
  const docs = Array.isArray(data?.content) ? data.content : [];
  const documents = docs.map(d => ({ id: d?.id || d?.url, url: d?.url, title: d?.title, content: d?.content || d?.text || '' })).filter(x => x?.url);
  return { content: [{ type: 'json', data: { documents, traceId } }] };
});

export const transport = new StreamableHTTPServerTransport({ path: '/messages/' });
