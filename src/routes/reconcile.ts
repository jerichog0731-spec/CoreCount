/**
 * CoreCount — Transaction Reconcile Route
 * PATCH /api/v1/transactions/:txId/reconcile
 *
 * Allows an operator to manually FORCE_APPROVE or FORCE_REJECT
 * a transaction that is stuck in HOLD_FOR_REVIEW after MCL failure.
 *
 * FORCE_APPROVE → recalculates packs, commits to master_stock + inventory,
 *                 increments client's total_distributions_received,
 *                 triggers ledger rebuild
 *
 * FORCE_REJECT  → marks as HOLD_FOR_REVIEW with rejection note (soft delete)
 */

import { Router, Request, Response } from 'express';
import db from '../db/db';
import eventBus from '../services/EventBusBackbone';

const router = Router();

// ─── PATCH /api/v1/transactions/:txId/reconcile ───────────────────────────────
router.patch('/:txId/reconcile', (req: Request, res: Response) => {
  const { txId } = req.params;
  const { adminAction, correctionNote, operatorName } = req.body as {
    adminAction?:    'FORCE_APPROVE' | 'FORCE_REJECT';
    correctionNote?: string;
    operatorName?:   string;
  };

  if (!adminAction || !['FORCE_APPROVE', 'FORCE_REJECT'].includes(adminAction)) {
    return res.status(400).json({ error: 'adminAction must be FORCE_APPROVE or FORCE_REJECT.' });
  }

  // Load the transaction log entry
  const txLog = db.prepare(`
    SELECT * FROM transaction_log WHERE transaction_id = ?
  `).get(txId) as Record<string, unknown> | undefined;

  if (!txLog) {
    return res.status(404).json({ error: `Transaction ${txId} not found.` });
  }

  if (txLog.mcl_verification_state === 'COMMITTED') {
    return res.status(409).json({ error: 'Transaction is already COMMITTED — cannot reconcile.' });
  }

  const operator = operatorName?.trim() || 'Admin Override';
  const note     = correctionNote?.trim() || '';

  // ── FORCE_APPROVE ─────────────────────────────────────────────────────────
  if (adminAction === 'FORCE_APPROVE') {
    const itemId        = txLog.item_id as number | null;
    const bulkOz        = txLog.bulk_oz_intake as number | null;
    const yieldOz       = txLog.conversion_yield_oz as number | null;

    if (!itemId || !bulkOz || !yieldOz) {
      return res.status(422).json({
        error: 'Cannot FORCE_APPROVE — transaction is missing item_id, bulk_oz_intake, or conversion_yield_oz.',
      });
    }

    const predictedPacks = Math.floor(bulkOz / yieldOz);

    try {
      const commit = db.transaction(() => {
        // 1. Mark transaction as COMMITTED
        db.prepare(`
          UPDATE transaction_log
          SET mcl_verification_state = 'COMMITTED',
              calculated_predicted_packs = ?,
              reconciliation_notes = ?
          WHERE transaction_id = ?
        `).run(
          predictedPacks,
          `Admin FORCE_APPROVE by [${operator}]: ${note || 'Manual override authorized.'}`,
          txId,
        );

        // 2. Update master_stock
        db.prepare(`
          UPDATE master_stock
          SET current_stock_packs = current_stock_packs + ?,
              last_updated = CURRENT_TIMESTAMP
          WHERE item_id = ?
        `).run(predictedPacks, itemId);

        // 3. Update inventory
        db.prepare(`
          UPDATE inventory
          SET current_stock_on_hand  = current_stock_on_hand + ?,
              expected_yield_units   = expected_yield_units + ?
          WHERE item_id = ?
        `).run(predictedPacks, predictedPacks, itemId);

        // 4. Increment client's total_distributions_received if linked
        const clientId = txLog.client_id as string | null;
        if (clientId) {
          db.prepare(`
            UPDATE clients
            SET total_distributions_received = total_distributions_received + 1
            WHERE client_id = ?
          `).run(clientId);
        }
      });

      commit();

      // Trigger ledger rebuild
      eventBus.emit('ledger:request_markdown_rebuild');

      console.log(`[RECONCILE] ✅ FORCE_APPROVE by [${operator}] on TX #${txId} — ${predictedPacks} packs committed.`);

      return res.json({
        success:        true,
        action:         'FORCE_APPROVE',
        transactionId:  txId,
        predictedPacks,
        message:        `Transaction COMMITTED by ${operator}. ${predictedPacks} packs added to stock.`,
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: msg });
    }
  }

  // ── FORCE_REJECT ──────────────────────────────────────────────────────────
  if (adminAction === 'FORCE_REJECT') {
    try {
      db.prepare(`
        UPDATE transaction_log
        SET mcl_verification_state = 'HOLD_FOR_REVIEW',
            reconciliation_notes = ?
        WHERE transaction_id = ?
      `).run(
        `Admin FORCE_REJECT by [${operator}]: ${note || 'Rejected — data integrity issue.'}`,
        txId,
      );

      console.log(`[RECONCILE] ✖ FORCE_REJECT by [${operator}] on TX #${txId}.`);

      return res.json({
        success:       true,
        action:        'FORCE_REJECT',
        transactionId: txId,
        message:       `Transaction rejected by ${operator}. Remains in HOLD_FOR_REVIEW with rejection note.`,
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: msg });
    }
  }
});

export default router;
