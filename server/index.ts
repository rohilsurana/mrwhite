import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { handleJoin, handleGetState, handleAction } from './api-handler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);

app.use(express.json());

app.post('/api/game', (req, res) => {
  const result = handleJoin(req.body);
  res.json(result);
});

app.get('/api/game', (req, res) => {
  const code = req.query.code as string;
  const playerId = req.query.playerId as string;
  if (!code || !playerId) {
    res.json({ ok: false, error: 'Missing code or playerId' });
    return;
  }
  res.json(handleGetState(code, playerId));
});

app.post('/api/game/action', (req, res) => {
  res.json(handleAction(req.body));
});

const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('{*path}', (_req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

const PORT = parseInt(process.env.PORT || '3001', 10);
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
