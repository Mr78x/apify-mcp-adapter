import { server, transport } from './shared.mjs';
export default async function handler(req, res) {
  await transport.handleSse(req, res, async (streams) => {
    await server.connect(streams);
  });
}
