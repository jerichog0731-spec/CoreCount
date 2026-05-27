/**
 * CoreCount — Clients API Routes
 * POST  /api/v1/clients                    — create new client
 * GET   /api/v1/clients/:clientId          — load client + eligibility
 * PATCH /api/v1/clients/:clientId/notes    — update operator internal notes
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/db';
import type { ClientRow } from '../db/db';
import { checkCooldown } from '../ai/decanting';

const router = Router();

// ─── POST /api/v1/clients — register a new client ────────────────────────────
router.post('/', (req: Request, res: Response) => {
  const { firstName, familySize } = req.body as { firstName?: string; familySize?: number };

  if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
    return res.status(400).json({ error: 'firstName is required.' });
  }

  const size = Number(familySize);
  if (!familySize || isNaN(size) || size < 1) {
    return res.status(400).json({ error: 'familySize must be a number ≥ 1.' });
  }

  const clientId = `PDH-${uuidv4().slice(0, 8).toUpperCase()}`;

  try {
    db.prepare(`
      INSERT INTO clients (client_id, first_name, family_size, total_distributions_received)
      VALUES (?, ?, ?, 0)
    `).run(clientId, firstName.trim(), size);

    const client = db.prepare('SELECT * FROM clients WHERE client_id = ?').get(clientId) as ClientRow;
    return res.status(201).json({ client, message: 'Client registered successfully.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
});

// ─── GET /api/v1/clients/:clientId — load client + eligibility ───────────────
router.get('/:clientId', (req: Request, res: Response) => {
  const { clientId } = req.params;

  const client = db.prepare('SELECT * FROM clients WHERE client_id = ?').get(clientId) as ClientRow | undefined;

  if (!client) {
    return res.status(404).json({ error: 'Client not found.' });
  }

  const eligibility = {
    Hygiene:  checkCooldown('Hygiene',  client.last_hygiene_date),
    Laundry:  checkCooldown('Laundry',  client.last_laundry_date),
    Cleaning: checkCooldown('Cleaning', client.last_cleaning_date),
    Special:  checkCooldown('Special',  client.last_special_date),
  };

  return res.json({ client, eligibility });
});

// ─── PATCH /api/v1/clients/:clientId/notes — update operator case notes ──────
router.patch('/:clientId/notes', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const { notes } = req.body as { notes?: string };

  if (typeof notes !== 'string') {
    return res.status(400).json({ error: 'notes must be a string.' });
  }

  const client = db.prepare('SELECT client_id FROM clients WHERE client_id = ?').get(clientId);
  if (!client) return res.status(404).json({ error: 'Client not found.' });

  db.prepare(`
    UPDATE clients SET internal_notes = ? WHERE client_id = ?
  `).run(notes.trim(), clientId);

  const updated = db.prepare('SELECT * FROM clients WHERE client_id = ?').get(clientId) as ClientRow;
  return res.json({ client: updated, message: 'Notes updated.' });
});

export default router;
