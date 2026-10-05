import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './src/server/app.ts';
import { serverEnv, validateStartup } from './src/server/config/env.ts';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Validate startup configurations
  validateStartup();

  const app = createApp();
  const PORT = serverEnv.PORT || 3000;

  // Vite Dev Server middleware mode in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Serve static frontend assets in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PDH Campus Order] Backend server is running on http://0.0.0.0:${PORT}`);
    console.log(`[PDH Campus Order] Health check available at: http://0.0.0.0:${PORT}/api/health`);
  });
}

startServer().catch((err) => {
  console.error('[PDH Campus Order] Failed to start server:', err);
  process.exit(1);
});
