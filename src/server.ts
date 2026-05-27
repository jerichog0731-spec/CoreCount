/**
 * CoreCount — Express Server Entry Point
 * Runs on http://localhost:5000
 * Connects to: SQLite database, Event Bus, AI stub layer, cron jobs
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';

// Route imports
import clientsRouter from './routes/clients';
import transactionsRouter from './routes/transactions';
import suppliesRouter from './routes/supplies';
import volunteersRouter from './routes/volunteers';
import draftsRouter from './routes/drafts';

// Jobs
import { startLowStockJob } from './jobs/low-stock';

// Event Bus — initialize on startup (singleton)
import './services/EventBusBackbone';

// ─── App setup ───────────────────────────────────────────────────────────────

const app = express();
const PORT = parseInt(process.env.PORT ?? '5000', 10);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the Ionic React dashboard from frontend/dist/
app.use(express.static(path.join(process.cwd(), 'frontend', 'dist')));


// ─── API Routes ──────────────────────────────────────────────────────────────

app.use('/api/v1/clients', clientsRouter);
app.use('/api/v1/transactions', transactionsRouter);
app.use('/api/v1/supplies', suppliesRouter);
app.use('/api/v1/intake', suppliesRouter);
app.use('/api/v1/volunteers', volunteersRouter);
app.use('/api/v1/drafts', draftsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'CoreCount C.O.R.E. Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    aiProvider: process.env.AI_PROVIDER ?? 'placeholder',
  });
});

// Event Bus log endpoint (last 50 entries from transaction_log)
app.get('/api/v1/event-log', (_req, res) => {
  const { default: db } = require('./db/db');
  const logs = db.prepare(
    'SELECT * FROM transaction_log ORDER BY created_at DESC LIMIT 50'
  ).all();
  res.json({ logs });
});

// SPA fallback — serve Ionic app for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(process.cwd(), 'frontend', 'dist', 'index.html'));
  }
});


// ─── Start server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║   C.O.R.E. Engine — CoreCount Local Backend           ║
║   Project Dignity Hobbs                               ║
╠═══════════════════════════════════════════════════════╣
║   🚀 Server running on  http://localhost:${PORT}         ║
║   🗄️  Database:         ${(process.env.DATABASE_PATH ?? 'data/pdh_core.db').padEnd(25)} ║
║   🤖 AI Provider:      ${(process.env.AI_PROVIDER ?? 'placeholder').padEnd(25)} ║
║   📋 Dashboard:        http://localhost:${PORT}          ║
╚═══════════════════════════════════════════════════════╝
  `);

  // Start background jobs
  startLowStockJob();
});

export default app;
