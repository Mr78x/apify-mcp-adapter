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
  await transport.handleRequest(req, res);
}
