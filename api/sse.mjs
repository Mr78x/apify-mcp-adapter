import { transport, server } from './shared.mjs';

let connected = false;
async function connectOnce() {
  if (!connected) {
    await server.connect(transport);
    connected = true;
  }
}

export default async function handler(req, res) {
  // Accept both GET (SSE) and POST (messages) on /sse
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  await connectOnce();
  await transport.handleRequest(req, res);
}
