/**
 * CoreCount — Transactions API Routes
 * POST /api/v1/transactions — dispense a resource to a client
 */

import { Router, Request, Response } from 'express';
import db from '../db/db';
import type { ClientRow } from '../db/db';
import { checkCooldown } from '../ai/decanting';

const router = Router();

type DispenseBody = {
  clientId?: string;
  category?: 'Hygiene' | 'Laundry' | 'Cleaning' | 'Special';
  pin?: string;
  volunteerName?: string;
  emergencyBypass?: boolean;
  itemId?: number;
};

// POST /api/v1/transactions — dispense supply to a client
router.post('/', (req: Request, res: Response) => {
  const { clientId, category, pin, volunteerName, emergencyBypass = false, itemId } = req.body as DispenseBody;

  // 1. Validate required fields
  if (!clientId || !category || !pin) {
    return res.status(400).json({ error: 'clientId, category, and pin are required.' });
  }

  const validCategories = ['Hygiene', 'Laundry', 'Cleaning', 'Special'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: `category must be one of: ${validCategories.join(', ')}` });
  }

  // 2. Verify admin PIN (server-side only)
  const adminPin = (process.env.ADMIN_PIN ?? '1234').trim();
  if (pin.trim() !== adminPin) {
    return res.status(403).json({ error: 'Invalid Admin PIN.' });
  }

  // 3. Load client
  const client = db.prepare('SELECT * FROM clients WHERE client_id = ?').get(clientId) as ClientRow | undefined;
  if (!client) {
    return res.status(404).json({ error: 'Client not found.' });
  }

  // 4. Check cooldown eligibility
  const lastDateField: Record<string, string | null> = {
    Hygiene: client.last_hygiene_date,
    Laundry: client.last_laundry_date,
    Cleaning: client.last_cleaning_date,
    Special: client.last_special_date,
  };

  const cooldown = checkCooldown(category, lastDateField[category]);

  if (!cooldown.eligible && !emergencyBypass) {
    return res.status(409).json({
      error: 'Client is within cooldown period.',
      daysRemaining: cooldown.daysRemaining,
      nextAvailableDate: cooldown.nextAvailableDate,
      hint: 'Set emergencyBypass: true with an authorized PIN to override.',
    });
  }

  // 5. Deduct from inventory (if itemId provided)
  if (itemId) {
    const item = db.prepare('SELECT * FROM inventory WHERE item_id = ?').get(itemId) as { current_stock_on_hand: number } | undefined;
    if (!item) {
      return res.status(404).json({ error: `Inventory item #${itemId} not found.` });
    }
    if (item.current_stock_on_hand <= 0) {
      return res.status(409).json({ error: 'Inventory item is out of stock.' });
    }
    db.prepare(`
      UPDATE inventory SET current_stock_on_hand = current_stock_on_hand - 1,
      actual_distributed_units = actual_distributed_units + 1
      WHERE item_id = ?
    `).run(itemId);
  }

  // 6. Update client's last-dispense date
  const timestamp = new Date().toISOString();
  const dateFields: Record<string, string> = {
    Hygiene: 'last_hygiene_date',
    Laundry: 'last_laundry_date',
    Cleaning: 'last_cleaning_date',
    Special: 'last_special_date',
  };
  db.prepare(`UPDATE clients SET ${dateFields[category]} = ? WHERE client_id = ?`).run(timestamp, clientId);

  // 7. Record transaction
  const result = db.prepare(`
    INSERT INTO transactions (client_id, category, item_id, units_dispensed, emergency_bypass, volunteer_name, timestamp)
    VALUES (?, ?, ?, 1, ?, ?, ?)
  `).run(clientId, category, itemId ?? null, emergencyBypass ? 1 : 0, volunteerName ?? null, timestamp);

  // 8. Increment client's total distribution count
  db.prepare(`
    UPDATE clients SET total_distributions_received = total_distributions_received + 1 WHERE client_id = ?
  `).run(clientId);

  return res.status(201).json({
    success: true,
    transactionId: result.lastInsertRowid,
    clientId,
    category,
    timestamp,
    emergencyBypass,
  });
});

export default router;
