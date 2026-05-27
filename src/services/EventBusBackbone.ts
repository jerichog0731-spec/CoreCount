/**
 * CoreCount — Event Bus Backbone Engine
 * ======================================
 * TypeScript rewrite and correction of Rules&Agents/CoreCount-Update.js
 *
 * This is the nervous system of the CoreCount engine. It:
 *  - Tracks asynchronous inventory intake operations
 *  - Routes item brands to OmniScrape (Python valuation bridge)
 *  - Executes the Multi-Consensus Loop (MCL) using the AI provider layer
 *  - Maintains data accountability logs in the SQLite database
 *
 * AI calls are routed through src/ai/aiProvider.ts — swap Qualcomm
 * models there without touching this file.
 */

import { EventEmitter } from 'events';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import db from '../db/db';
import { runConsensusA, runConsensusB, computeValuation } from '../ai/aiProvider';
import { calculateDecant } from '../ai/decanting';

// ─── Types ────────────────────────────────────────────────────────────────────

export type IntakePayload = {
  itemId: number;
  itemName: string;
  itemBrand: string;
  itemCategory: string;
  bulkOzIntake: number;
  conversionYieldOz: number;
};

export type TxPayload = {
  transactionId: string;
  operatorSignature: string;
  payload: IntakePayload;
};

// ─── Event Bus Backbone ───────────────────────────────────────────────────────

class CoreCountEventBus extends EventEmitter {
  constructor() {
    super();
    // Allow unlimited listeners for local structural scaling
    this.setMaxListeners(0);
    this.registerCoreSubscribers();
    console.log('[EVENT BUS] 🚀 CoreCount Event Bus initialized.');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT 1: inventory:intake_registered
  // Triggered when an operator submits a new inventory intake
  // ═══════════════════════════════════════════════════════════════════════════
  private registerCoreSubscribers(): void {

    this.on('inventory:intake_registered', async (txPayload: TxPayload) => {
      const { transactionId, operatorSignature, payload } = txPayload;

      console.log(`\n[EVENT BUS] 📥 Intake Event #${transactionId}`);
      console.log(`  └─ Operator: [${operatorSignature}]`);
      console.log(`  └─ Brand: "${payload.itemBrand}" | Item: "${payload.itemName}"`);

      // Parallel: OmniScrape pricing + MCL validation
      this.emit('omniscrape:trigger_lookup', { transactionId, itemId: payload.itemId, itemBrand: payload.itemBrand, itemCategory: payload.itemCategory });
      this.emit('mcl:trigger_validation', txPayload);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // EVENT 2: omniscrape:trigger_lookup
    // Launches Python valuation bridge or AI fallback
    // ═══════════════════════════════════════════════════════════════════════
    this.on('omniscrape:trigger_lookup', async (lookupData: { transactionId: string; itemId: number; itemBrand: string; itemCategory: string }) => {
      const { transactionId, itemId, itemBrand, itemCategory } = lookupData;
      console.log(`[EVENT BUS] 🌐 OmniScrape → Brand: "${itemBrand}"`);

      // Sanitize brand name for shell safety
      const safeBrand = itemBrand.replace(/[^a-zA-Z0-9 ]/g, '');
      const scriptPath = path.join(process.cwd(), 'omniscrape.py');
      const cmd = `python3 "${scriptPath}" "${safeBrand}" "${itemCategory}"`;

      exec(cmd, { timeout: 30000 }, (error, stdout) => {
        if (error) {
          console.warn(`[EVENT BUS] ⚠️ OmniScrape Python bridge failed: ${error.message}. Falling back to AI provider.`);
          // Fallback to AI valuation stub
          computeValuation(itemBrand, itemCategory)
            .then((result) => {
              this.emit('omniscrape:valuation_resolved', {
                transactionId, itemId,
                computedAverageValuePerOz: result.computedAverageValuePerOz,
                fairMarketValuePerPack: result.fairMarketValuePerPack,
                auditSiloType: result.transactionSiloType,
              });
            })
            .catch((err) => console.error('[EVENT BUS] AI valuation fallback also failed:', err));
          return;
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          this.emit('omniscrape:valuation_resolved', {
            transactionId,
            itemId,
            computedAverageValuePerOz: parsed.computedAverageValuePerOz,
            fairMarketValuePerPack: parsed.fairMarketValuePerPack,
            auditSiloType: parsed.transactionSiloType,
          });
        } catch {
          console.warn(`[EVENT BUS] ⚠️ OmniScrape output could not be parsed — skipping valuation.`);
        }
      });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // EVENT 3: mcl:trigger_validation
    // Dual-thread consensus via AI provider (Qualcomm swap-ready)
    // ═══════════════════════════════════════════════════════════════════════
    this.on('mcl:trigger_validation', async (txPayload: TxPayload) => {
      const { transactionId, payload } = txPayload;

      console.log(`[EVENT BUS] 🧠 MCL — Dual Consensus Thread for #${transactionId}`);

      const yieldResult = calculateDecant({
        bulkOzTotal: payload.bulkOzIntake,
        unitYieldOz: payload.conversionYieldOz,
      });

      const consensusInput = {
        bulkInputMassOz: payload.bulkOzIntake,
        unitYieldOz: payload.conversionYieldOz,
        claimedYieldResult: yieldResult.adjustedYieldUnits,
        itemCategoryContext: payload.itemCategory,
      };

      try {
        const [resultA, resultB] = await Promise.all([
          runConsensusA(consensusInput),
          runConsensusB(consensusInput),
        ]);

        const volumeOk = payload.bulkOzIntake <= 500;

        if (resultA.valid && resultB.valid && volumeOk) {
          console.log(`[EVENT BUS] ✅ MCL Consensus REACHED for #${transactionId}`);
          this.emit('mcl:consensus_success', {
            transactionId,
            predictedPacks: yieldResult.adjustedYieldUnits,
            itemId: payload.itemId,
          });
        } else {
          const notes = [
            !resultA.valid ? `Thread-A: ${resultA.reason ?? 'invalid'}` : null,
            !resultB.valid ? `Thread-B: ${resultB.reason ?? 'invalid'}` : null,
            !volumeOk ? `Volume overflow: ${payload.bulkOzIntake}oz > 500oz ceiling` : null,
          ]
            .filter(Boolean)
            .join('; ');
          console.warn(`[EVENT BUS] ❌ MCL Consensus FAILED for #${transactionId}: ${notes}`);
          this.emit('mcl:consensus_failed', { transactionId, rationaleNotes: notes });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[EVENT BUS] CRITICAL: MCL execution error: ${msg}`);
        this.emit('mcl:consensus_failed', { transactionId, rationaleNotes: `Execution error: ${msg}` });
      }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // EVENT 4: mcl:consensus_success
    // Commits verified intake to database
    // ═══════════════════════════════════════════════════════════════════════
    this.on('mcl:consensus_success', (data: { transactionId: string; predictedPacks: number; itemId: number }) => {
      const { transactionId, predictedPacks, itemId } = data;

      const commit = db.transaction(() => {
        db.prepare(`
          UPDATE transaction_log
          SET mcl_verification_state = 'COMMITTED', calculated_predicted_packs = ?
          WHERE transaction_id = ?
        `).run(predictedPacks, transactionId);

        db.prepare(`
          UPDATE master_stock
          SET current_stock_packs = current_stock_packs + ?, last_updated = CURRENT_TIMESTAMP
          WHERE item_id = ?
        `).run(predictedPacks, itemId);

        db.prepare(`
          UPDATE inventory
          SET current_stock_on_hand = current_stock_on_hand + ?, expected_yield_units = expected_yield_units + ?
          WHERE item_id = ?
        `).run(predictedPacks, predictedPacks, itemId);
      });

      commit();
      console.log(`[EVENT BUS] 💾 Committed #${transactionId} — ${predictedPacks} packs added to stock.`);
      this.emit('ledger:request_markdown_rebuild');
    });

    // ═══════════════════════════════════════════════════════════════════════
    // EVENT 5: mcl:consensus_failed
    // Quarantines transaction for human review
    // ═══════════════════════════════════════════════════════════════════════
    this.on('mcl:consensus_failed', (data: { transactionId: string; rationaleNotes: string }) => {
      const { transactionId, rationaleNotes } = data;

      db.prepare(`
        UPDATE transaction_log
        SET mcl_verification_state = 'HOLD_FOR_REVIEW', reconciliation_notes = ?
        WHERE transaction_id = ?
      `).run(`MCL Auto-Guardrail: ${rationaleNotes}`, transactionId);

      console.warn(`[EVENT BUS] ⚠️ #${transactionId} → HOLD_FOR_REVIEW: ${rationaleNotes}`);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // EVENT 6: omniscrape:valuation_resolved
    // Updates fair market value in master_stock
    // ═══════════════════════════════════════════════════════════════════════
    this.on('omniscrape:valuation_resolved', (data: {
      transactionId: string;
      itemId: number;
      computedAverageValuePerOz: number;
      fairMarketValuePerPack: number;
      auditSiloType: 'GIVEN' | 'ACCEPTED';
    }) => {
      const { transactionId, itemId, fairMarketValuePerPack, auditSiloType } = data;

      try {
        db.prepare(`
          UPDATE master_stock
          SET fair_market_value_per_pack = ?, last_updated = CURRENT_TIMESTAMP
          WHERE item_id = ?
        `).run(fairMarketValuePerPack, itemId);

        db.prepare(`
          UPDATE inventory
          SET unit_fair_market_value = ?
          WHERE item_id = ?
        `).run(fairMarketValuePerPack, itemId);

        console.log(`[EVENT BUS] 📈 FMV updated for item #${itemId} → $${fairMarketValuePerPack}/pack`);
        this.emit('audit:export_silo_log', { transactionId, auditSiloType });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[EVENT BUS] ❌ Valuation write failed: ${msg}`);
      }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // EVENT 7: audit:export_silo_log
    // Writes transparency JSON audit file to metrics/given or metrics/accepted
    // ═══════════════════════════════════════════════════════════════════════
    this.on('audit:export_silo_log', (data: { transactionId: string; auditSiloType: 'GIVEN' | 'ACCEPTED' }) => {
      const { transactionId, auditSiloType } = data;

      try {
        const record = db.prepare('SELECT * FROM transaction_log WHERE transaction_id = ?').get(transactionId);
        if (!record) return;

        const siloDir = path.join(process.cwd(), 'metrics', auditSiloType.toLowerCase());
        fs.mkdirSync(siloDir, { recursive: true });

        const filePath = path.join(siloDir, `tx_audit_${transactionId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf8');

        console.log(`[AUDIT] 📄 Silo log written → ${filePath}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[AUDIT] ❌ Silo log write failed: ${msg}`);
      }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // EVENT 8: ledger:request_markdown_rebuild
    // Rebuilds a human-readable Markdown ledger summary
    // ═══════════════════════════════════════════════════════════════════════
    this.on('ledger:request_markdown_rebuild', () => {
      try {
        const items = db.prepare('SELECT * FROM inventory').all() as Array<Record<string, unknown>>;
        const lines = [
          `# C.O.R.E. Inventory Ledger`,
          `> Generated: ${new Date().toLocaleString()}`,
          '',
          '| Item | Category | In Stock | Fair Market Value |',
          '|------|----------|----------|-------------------|',
          ...items.map((i) => `| ${i.item_name} | ${i.material_category} | ${i.current_stock_on_hand} | $${Number(i.unit_fair_market_value).toFixed(2)}/unit |`),
        ];
        const ledgerPath = path.join(process.cwd(), 'data', 'ledger.md');
        fs.writeFileSync(ledgerPath, lines.join('\n'), 'utf8');
        console.log(`[LEDGER] 📋 Ledger rebuilt → ${ledgerPath}`);
      } catch (err) {
        console.error('[LEDGER] ❌ Rebuild failed:', err);
      }
    });
  }
}

// Singleton export — the entire app shares one event bus instance
const eventBus = new CoreCountEventBus();
export default eventBus;
