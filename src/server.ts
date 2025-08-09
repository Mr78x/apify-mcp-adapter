import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { SearchInput, FetchInput } from "./schemas.js";
import { withApify, docsSearch, docsFetch } from "./apifyClient.js";
import { withTrace, log } from "./logging.js";

const app = express();
const PORT = Number(process.env.PORT || 8787);

// Basic network hardening
app.set("trust proxy", true);
app.disable("x-powered-by");

// Rate limit (per-minute window)
const limiter = rateLimit({ windowMs: 60_000, max: Number(process.env.RATE_LIMIT || 60) });
app.use(limiter);

// MCP server
const server = new McpServer({ name: "apify-mcp-adapter", version: "1.0.0" });

server.tool(
  "search",
  {
    // JSON Schema (loosely mirrored to our Zod validation)
    type: "object",
    properties: { query: { type: "string" }, topK: { type: "number" }, traceId: { type: "string" } },
    required: ["query"],
    additionalProperties: false,
  },
  async ({ query, topK = 8, traceId }) => {
    const logger = withTrace(traceId);
    logger.info({ query, topK }, "search.start");
    const data = await withApify(client => docsSearch(client, query, topK));
    // Upstream returns content blocks; normalize → our contract
    const hits = Array.isArray((data as any).content) ? (data as any).content : [];
    const items = hits.map((h: any) => ({
      id: h?.id || h?.url,
      title: h?.title,
      url: h?.url,
      snippet: h?.snippet,
      score: h?.score,
    })).filter((x: any) => x?.url);
    const objectIds = items.map((x: any) => x.url);
    logger.info({ count: items.length }, "search.ok");
    return {
      content: [
        { type: "json", data: { objectIds, items, traceId } },
      ],
    };
  }
);

server.tool(
  "fetch",
  {
    type: "object",
    properties: { objectIds: { type: "array", items: { type: "string" } }, traceId: { type: "string" } },
    required: ["objectIds"],
    additionalProperties: false,
  },
  async ({ objectIds, traceId }) => {
    const logger = withTrace(traceId);
    logger.info({ count: objectIds.length }, "fetch.start");
    const data = await withApify(client => docsFetch(client, objectIds));
    const docs = Array.isArray((data as any).content) ? (data as any).content : [];
    const documents = docs.map((d: any) => ({
      id: d?.id || d?.url,
      url: d?.url,
      title: d?.title,
      content: d?.content || d?.text || "",
    })).filter((x: any) => x?.url);
    logger.info({ count: documents.length }, "fetch.ok");
    return {
      content: [
        { type: "json", data: { documents, traceId } },
      ],
    };
  }
);

// Wire Streamable HTTP transport to Express
const transport = new StreamableHTTPServerTransport({
  path: "/messages/",
});

app.get("/sse", async (req, res) => {
  await transport.handleSse(req, res, async (streams) => {
    await server.connect(streams);
  });
});

app.post("/messages/", express.json({ limit: "1mb" }), async (req, res) => {
  await transport.handlePostMessage(req, res);
});

app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

app.listen(PORT, () => log.info({ PORT }, "apify-mcp-adapter listening"));
