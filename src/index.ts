#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// LoopIn API — Human-in-the-loop interrupt service for AI agents
//
// Environment variables:
//   PORT             — HTTP port  (default: 3002)
//   LOOPIN_BASE_URL  — Public base URL used to build reviewUrl links
//                      (default: http://localhost:3002)
//   API_KEY_SECRET   — Optional API key to require on all requests
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { startExpiryChecker } from './services/expiry';
import interruptsRouter from './routes/interrupts';
import analyticsRouter  from './routes/analytics';
import reviewRouter     from './routes/review';

const app  = express();
const port = process.env.PORT || 3002;
const apiKey = process.env['API_KEY_SECRET'];

app.use(express.json());

// ── Optional API key auth (skip for review pages) ────────────────────────────
if (apiKey) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/review/') || req.path === '/health' || req.path === '/openapi.json') {
      return next();
    }
    const key = req.headers['x-api-key'];
    if (key !== apiKey) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/interrupts', interruptsRouter);
app.use('/analytics',  analyticsRouter);
app.use('/review',     reviewRouter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'loopin-api' });
});

// Serve OpenAPI spec
import { readFileSync } from 'fs';
import { join }        from 'path';

app.get('/openapi.json', (_req: Request, res: Response) => {
  try {
    const spec = readFileSync(join(__dirname, '../../openapi.json'), 'utf-8');
    res.json(JSON.parse(spec));
  } catch {
    res.status(500).json({ error: 'OpenAPI spec not found' });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(Number(port), () => {
  process.stderr.write(`LoopIn API running on port ${port}\n`);
  startExpiryChecker();
});
