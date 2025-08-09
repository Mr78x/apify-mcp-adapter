import {
  Client,
} from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const upstreamUrl = process.env.APIFY_MCP_URL || "https://mcp.apify.com";
const apifyToken = process.env.APIFY_TOKEN!;
const toolsFilter = (process.env.APIFY_TOOLS || "docs").split(",");

export async function withApify<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const transport = new StreamableHTTPClientTransport(upstreamUrl, {
    headers: { Authorization: `Bearer ${apifyToken}` },
  });
  const client = new Client(transport);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

export async function docsSearch(client: Client, query: string, topK = 8) {
  // Ensure docs tools are available; Apify names: search-apify-docs
  const tools = await client.listTools();
  const searchTool = tools.tools.find(t => t.name === "search-apify-docs");
  if (!searchTool) throw new Error("Upstream tool 'search-apify-docs' not found");
  const res = await client.callTool("search-apify-docs", { query, topK, tools: toolsFilter });
  return res;
}

export async function docsFetch(client: Client, ids: string[]) {
  const tools = await client.listTools();
  const fetchTool = tools.tools.find(t => t.name === "fetch-apify-docs");
  if (!fetchTool) throw new Error("Upstream tool 'fetch-apify-docs' not found");
  const res = await client.callTool("fetch-apify-docs", { ids });
  return res;
}
