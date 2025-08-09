import { transport, server } from './shared.mjs';

let connected = false;
async function connectOnce() {
  if (!connected) {
    await server.connect(transport);
    connected = true;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }
  await connectOnce();
  await transport.handleRequest(req, res);
}
```js
import { transport } from './shared.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  try {
    await transport.handlePostMessage(req, res);
  } catch (err) {
    console.error('messages handler error', err);
    res.status(500).send('Internal Server Error');
  }
}
