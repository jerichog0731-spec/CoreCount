/**
 * CoreCount — Supplies & Intake API Routes
 * GET   /api/v1/supplies         — list all inventory items with stock levels
 * PATCH /api/v1/supplies/:id     — adjust quantity of a supply item
 * POST  /api/v1/intake/parse     — AI-powered intake parser → yield + event bus
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/db';
import type { InventoryRow } from '../db/db';
import { parseIntakeText } from '../ai/aiProvider';
import { calculateDecant, isLowStock } from '../ai/decanting';
import eventBus from '../services/EventBusBackbone';

const router = Router();

// GET /api/v1/supplies — list all supplies with stock alert flags
router.get('/', (_req: Request, res: Response) => {
  const supplies = db.prepare('SELECT * FROM inventory ORDER BY material_category, item_name').all() as InventoryRow[];
  const withAlerts = supplies.map((s) => ({
    ...s,
    lowStock: isLowStock(s.current_stock_on_hand, s.min_threshold),
  }));
  return res.json({ supplies: withAlerts });
});

// PATCH /api/v1/supplies/:id — adjust a supply's stock quantity
router.patch('/:id', (req: Request, res: Response) => {
  const itemId = parseInt(req.params.id, 10);
  if (isNaN(itemId)) {
    return res.status(400).json({ error: 'Invalid item ID.' });
  }

  const { adjustment, reason } = req.body as { adjustment?: number; reason?: string };
  if (adjustment == null || isNaN(Number(adjustment))) {
    return res.status(400).json({ error: 'adjustment (number) is required.' });
  }

  const item = db.prepare('SELECT * FROM inventory WHERE item_id = ?').get(itemId) as InventoryRow | undefined;
  if (!item) {
    return res.status(404).json({ error: `Supply item #${itemId} not found.` });
  }

  const newStock = Math.max(0, item.current_stock_on_hand + Number(adjustment));
  db.prepare('UPDATE inventory SET current_stock_on_hand = ? WHERE item_id = ?').run(newStock, itemId);

  const updated = db.prepare('SELECT * FROM inventory WHERE item_id = ?').get(itemId) as InventoryRow;
  return res.json({ item: updated, adjustment, reason: reason ?? null, newStock });
});

// POST /api/v1/supplies — create a new supply item
router.post('/', (req: Request, res: Response) => {
  const { itemName, itemBrand, materialCategory, unitConversionFactor, unitFairMarketValue, minThreshold } = req.body as {
    itemName?: string;
    itemBrand?: string;
    materialCategory?: string;
    unitConversionFactor?: number;
    unitFairMarketValue?: number;
    minThreshold?: number;
  };

  const validCats = ['Hygiene', 'Laundry', 'Cleaning', 'Special'];
  if (!itemName || !materialCategory || !validCats.includes(materialCategory)) {
    return res.status(400).json({ error: 'itemName and a valid materialCategory are required.' });
  }

  const result = db.prepare(`
    INSERT INTO inventory (item_name, item_brand, material_category, unit_conversion_factor, unit_fair_market_value, min_threshold)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    itemName,
    itemBrand ?? null,
    materialCategory,
    unitConversionFactor ?? 0,
    unitFairMarketValue ?? 0,
    minThreshold ?? 5,
  );

  // Initialize master_stock row
  db.prepare('INSERT OR IGNORE INTO master_stock (item_id) VALUES (?)').run(result.lastInsertRowid);

  const item = db.prepare('SELECT * FROM inventory WHERE item_id = ?').get(result.lastInsertRowid);
  return res.status(201).json({ item });
});

// POST /api/v1/intake/parse — AI-powered intake text parser
router.post('/parse', async (req: Request, res: Response) => {
  const { rawText, operatorName } = req.body as { rawText?: string; operatorName?: string };

  if (!rawText || rawText.trim().length === 0) {
    return res.status(400).json({ error: 'rawText is required.' });
  }

  try {
    // 1. Parse with AI stub (Qualcomm model swap point in aiProvider.ts)
    const parsed = await parseIntakeText(rawText);

    // 2. Calculate yield via decanting math
    const decant = calculateDecant({
      bulkOzTotal: parsed.bulkOzIntake,
      unitYieldOz: parsed.conversionYieldOz,
    });

    // 3. Find or create the inventory item
    let item = db.prepare('SELECT * FROM inventory WHERE item_name = ? AND item_brand = ?')
      .get(parsed.itemName, parsed.itemBrand) as InventoryRow | undefined;

    if (!item) {
      const ins = db.prepare(`
        INSERT INTO inventory (item_name, item_brand, material_category, unit_conversion_factor)
        VALUES (?, ?, ?, ?)
      `).run(parsed.itemName, parsed.itemBrand, parsed.category, parsed.conversionYieldOz);

      db.prepare('INSERT OR IGNORE INTO master_stock (item_id) VALUES (?)').run(ins.lastInsertRowid);
      item = db.prepare('SELECT * FROM inventory WHERE item_id = ?').get(ins.lastInsertRowid) as InventoryRow;
    }

    // 4. Create transaction_log entry for Event Bus
    const txId = `TX-${uuidv4().slice(0, 12).toUpperCase()}`;
    db.prepare(`
      INSERT INTO transaction_log
        (transaction_id, operator_signature, item_id, item_brand, item_category, bulk_oz_intake, conversion_yield_oz)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(txId, operatorName ?? 'System', item.item_id, parsed.itemBrand, parsed.category, parsed.bulkOzIntake, parsed.conversionYieldOz);

    // 5. Fire Event Bus intake pipeline
    eventBus.emit('inventory:intake_registered', {
      transactionId: txId,
      operatorSignature: operatorName ?? 'System',
      payload: {
        itemId: item.item_id,
        itemName: parsed.itemName,
        itemBrand: parsed.itemBrand,
        itemCategory: parsed.category,
        bulkOzIntake: parsed.bulkOzIntake,
        conversionYieldOz: parsed.conversionYieldOz,
      },
    });

    return res.status(202).json({
      message: 'Intake accepted. MCL validation in progress.',
      transactionId: txId,
      parsed,
      decant,
      itemId: item.item_id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
});

export default router;
