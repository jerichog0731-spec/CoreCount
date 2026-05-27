/**
 * CoreCount — Low Stock Cron Job
 * Runs every hour and auto-generates pending draft alerts
 * for any supply item that has fallen to or below its min_threshold.
 */

import cron from 'node-cron';
import db from '../db/db';
import type { InventoryRow, DraftRow } from '../db/db';
import { isLowStock } from '../ai/decanting';
import { generateStockDraft } from '../ai/aiProvider';

export function startLowStockJob(): void {
  // Run at the top of every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] 🔍 Running low-stock sweep...');

    const items = db.prepare('SELECT * FROM inventory').all() as InventoryRow[];
    const alertItems = items.filter((i) => isLowStock(i.current_stock_on_hand, i.min_threshold));

    for (const item of alertItems) {
      // Skip if a pending draft for this item already exists
      const existing = db.prepare(`
        SELECT id FROM drafts WHERE trigger_item_id = ? AND status = 'pending'
      `).get(item.item_id) as DraftRow | undefined;

      if (existing) continue;

      try {
        const draft = await generateStockDraft(item.item_name, item.current_stock_on_hand, 'social');
        db.prepare(`
          INSERT INTO drafts (draft_type, subject, body, trigger_item_id)
          VALUES (?, ?, ?, ?)
        `).run(draft.type, draft.subject ?? null, draft.body, item.item_id);

        console.log(`[CRON] 📢 Draft generated for low-stock item: "${item.item_name}" (${item.current_stock_on_hand} remaining)`);
      } catch (err) {
        console.error(`[CRON] ❌ Failed to generate draft for "${item.item_name}":`, err);
      }
    }

    if (alertItems.length === 0) {
      console.log('[CRON] ✅ All supply levels above threshold.');
    }
  });

  console.log('[CRON] ⏰ Low-stock sweep scheduled — runs every hour.');
}
