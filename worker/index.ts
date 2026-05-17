export { GameRoom } from './game-room';

interface Env {
  GAME_ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
}

function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function extractGameCode(request: Request, url: URL): Promise<string> {
  if (request.method === 'POST') {
    const body = await request.clone().json() as Record<string, unknown>;
    return (body.gameCode as string) || generateGameCode();
  }
  return url.searchParams.get('code') || generateGameCode();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/game')) {
      const gameCode = await extractGameCode(request, url);
      const id = env.GAME_ROOM.idFromName(gameCode);
      const room = env.GAME_ROOM.get(id);
      const roomUrl = new URL(request.url);
      roomUrl.searchParams.set('_code', gameCode);
      return room.fetch(new Request(roomUrl.toString(), request));
    }

    return env.ASSETS.fetch(request);
  },
};
