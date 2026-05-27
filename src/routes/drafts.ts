/**
 * CoreCount — Drafts Review Hub API Routes
 * POST /api/v1/drafts/generate  — generate a low-stock outreach draft
 * GET  /api/v1/drafts            — list all drafts in the review queue
 * PATCH /api/v1/drafts/:id       — update draft status (approve/dismiss)
 */

import { Router, Request, Response } from 'express';
import db from '../db/db';
import type { InventoryRow, DraftRow } from '../db/db';
import { generateStockDraft } from '../ai/aiProvider';

const router = Router();

// POST /api/v1/drafts/generate — generate social/email draft for a low-stock item
router.post('/generate', async (req: Request, res: Response) => {
  const { itemId, draftType = 'social' } = req.body as { itemId?: number; draftType?: 'social' | 'email' };

  if (!itemId) {
    return res.status(400).json({ error: 'itemId is required.' });
  }

  const item = db.prepare('SELECT * FROM inventory WHERE item_id = ?').get(itemId) as InventoryRow | undefined;
  if (!item) {
    return res.status(404).json({ error: `Inventory item #${itemId} not found.` });
  }

  try {
    const draft = await generateStockDraft(item.item_name, item.current_stock_on_hand, draftType);

    const result = db.prepare(`
      INSERT INTO drafts (draft_type, subject, body, trigger_item_id)
      VALUES (?, ?, ?, ?)
    `).run(draft.type, draft.subject ?? null, draft.body, itemId);

    const saved = db.prepare('SELECT * FROM drafts WHERE id = ?').get(result.lastInsertRowid) as DraftRow;
    return res.status(201).json({ draft: saved });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
});

// GET /api/v1/drafts — list all drafts (optionally filter by status)
router.get('/', (req: Request, res: Response) => {
  const { status } = req.query as { status?: string };

  let drafts: DraftRow[];
  if (status) {
    drafts = db.prepare('SELECT * FROM drafts WHERE status = ? ORDER BY created_at DESC').all(status) as DraftRow[];
  } else {
    drafts = db.prepare('SELECT * FROM drafts ORDER BY created_at DESC').all() as DraftRow[];
  }

  return res.json({ drafts, total: drafts.length });
});

// PATCH /api/v1/drafts/:id — update draft status
router.patch('/:id', (req: Request, res: Response) => {
  const draftId = parseInt(req.params.id, 10);
  if (isNaN(draftId)) return res.status(400).json({ error: 'Invalid draft ID.' });

  const { status } = req.body as { status?: 'approved' | 'sent' | 'dismissed' };
  const validStatuses = ['approved', 'sent', 'dismissed'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  db.prepare('UPDATE drafts SET status = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, draftId);
  const updated = db.prepare('SELECT * FROM drafts WHERE id = ?').get(draftId) as DraftRow | undefined;

  if (!updated) return res.status(404).json({ error: 'Draft not found.' });
  return res.json({ draft: updated });
});

export default router;
