// Express Application Factory for Local Server and Vercel Serverless Handler
import express from 'express';
import { apiRouter } from './routes/apiRouter.ts';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Mount backend API routes under /api
  app.use('/api', apiRouter);

  return app;
}
