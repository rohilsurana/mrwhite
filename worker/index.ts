export { GameRoom } from './game-room';

interface Env {
  GAME_ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/ws') {
      const upgrade = request.headers.get('Upgrade');
      if (upgrade !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 });
      }
      const id = env.GAME_ROOM.idFromName('default');
      const room = env.GAME_ROOM.get(id);
      return room.fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
};
