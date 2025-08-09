import { transport, server } from './shared.mjs';

let connected = false;
async function connectOnce() {
  if (!connected) {
    await server.connect(transport);
    connected = true;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).send('Method Not Allowed'); return; }
  await connectOnce();
  // Streamable HTTP uses a single handler for GET (SSE) and POST (messages)
  await transport.handleRequest(req, res);
}
```js
import { server, transport } from './shared.mjs';
export default async function handler(req, res) {
  await transport.handleSse(req, res, async (streams) => {
    await server.connect(streams);
  });
}
