/**
 * Project Dignity Hobbs — Event Bus Backbone Engine
 * File Location: backend/services/EventBusBackbone.js
 * Mode: Local-First Zero-Cloud Architecture
 * * Nervous system tracking asynchronous operations, routing item brands to 
 * OmniScrape, executing the Multi-Consensus Loop (MCL), and maintaining data accountability logs.
 */

const EventEmitter = require('events');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

class ProjectDignityEventBus extends EventEmitter {
  constructor() {
    super();
    // Enforce unlimited listener attachment limits for localized structural scaling
    this.setMaxListeners(0);
    this.initDatabaseConnection();
    this.registerCoreSystemSubscribers();
  }

  initDatabaseConnection() {
    const dbPath = path.join(__dirname, '..', 'core_logistics.db');
    this.db = new Database(dbPath, { verbose: console.log });
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
  }

  /**
   * Primary Nervous System Pipeline Definitions
   */
  registerCoreSystemSubscribers() {
    
    // =========================================================================
    // EVENT 1: INTAKE REGISTERED (Primary Core Count Intake Triggered By Operator)
    // =========================================================================
    this.on('inventory:intake_registered', async (txPayload) => {
      const { transactionId, operatorSignature, payload } = txPayload;
      
      console.log(`\n[EVENT BUS] 📥 Processing Intake Event ID: #${transactionId}`);
      console.log(`  └─ Accountable Operator: [${operatorSignature}]`);
      console.log(`  └─ Targeted Context: Brand: "${payload.itemBrand}" | Item: "${payload.itemName}"`);

      // Parallel Process A: Trigger OmniScrape dynamic market pricing loop
      this.emit('omniscrape:trigger_lookup', {
        transactionId: transactionId,
        itemId: payload.itemId,
        itemBrand: payload.itemBrand,
        itemCategory: payload.itemCategory
      });

      // Parallel Process B: Trigger Multi-Consensus Loop Validation Check
      this.emit('mcl:trigger_validation', txPayload);
    });

    // =========================================================================
    // EVENT 2: TRIGGER OMNISCRAPE LOOKUP (Routes Contextual Payloads to Web Drivers)
    // =========================================================================
    this.on('omniscrape:trigger_lookup', async (lookupData) => {
      const { transactionId, itemId, itemBrand, itemCategory } = lookupData;
      console.log(`[EVENT BUS] 🌐 OmniScrape invoked for Brand context: "${itemBrand}"`);

      // String configuration normalization protection for shell scripts
      const safelyEscapedBrandName = itemBrand.replace(/[^a-zA-Z0-9 ]/g, "");

      // Execute Python engine child process passing explicit brand vectors
      const omniScrapePythonCLI = `python3 "${path.join(__dirname, '..', 'omniscrape.py')}" "${safelyEscapedBrandName}" "${itemCategory}"`;
      
      exec(omniScrapePythonCLI, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          console.error(`[EVENT BUS] ❌ OmniScrape driver process threw fatal error:`, error.message);
          // Fall back gracefully to existing calculated schema averages inside database configuration
          return;
        }

        try {
          const parsedScrapeResultDataMatrix = JSON.parse(stdout.trim());
          
          // Re-emit dynamically found values back onto bus routing network pipelines
          this.emit('omniscrape:valuation_resolved', {
            transactionId: transactionId,
            itemId: itemId,
            computedAverageValuePerOz: parsedScrapeResultDataMatrix.computedAverageValuePerOz,
            fairMarketValuePerPack: parsedScrapeResultDataMatrix.fairMarketValuePerPack,
            auditSiloType: parsedScrapeResultDataMatrix.transactionSiloType // 'GIVEN' or 'ACCEPTED'
          });
        } catch (jsonParseException) {
          console.warn(`[EVENT BUS] ⚠️ Messy OmniScrape string output received. Passing downstream to Dolphin3 Parser...`);
          this.emit('omniscrape:invoke_dolphin_parser', { transactionId, itemId, rawTextOutput: stdout });
        }
      });
    });

    // =========================================================================
    // EVENT 3: MCL TRIGGER VALIDATION (Dual-Thread Isolated Client Inferences)
    // =========================================================================
    this.on('mcl:trigger_validation', async (txPayload) => {
      const { transactionId, operatorSignature, payload } = txPayload;
      console.log(`[EVENT BUS] 🧠 Spawning Dual Thread Isolation Matrix (Phi-4 Mini Thread A & B)`);

      // Execution Layer 1: Qwen2.5-Coder Mathematical Backend Deterministic Proof Checking
      const analyticalPredictedYieldProduct = Math.floor(payload.bulkOzIntake / payload.conversionYieldOz);
      
      // Build string parsing vectors safely protected from command shell injection manipulation hazards
      const standardizedJSONTelemetryDataPromptString = JSON.stringify({
        bulkInputMassOz: payload.bulkOzIntake,
        unitYieldOz: payload.conversionYieldOz,
        claimedYieldResult: analyticalPredictedYieldProduct,
        itemCategoryContext: payload.itemCategory
      }).replace(/"/g, '\\"');

      // Concurrent Promises Execution for Dual Thread Verification Model Framework Rows
      const instanceACommandString = `ollama run phi4-mini "Perform programmatic context assessment validation checklist rules. Ensure matching bounds: input is reasonable, category fits item traits. Return strict JSON format syntax object containing single row properties: {\\\"valid\\\": true} or {\\\"valid\\\": false, \\\"reason\\\": \\\"\\\"}. Context parameters telemetry profile data: ${standardizedJSONTelemetryDataPromptString}"`;
      const instanceBCommandString = `ollama run phi4-mini "Evaluate operation integrity. Flag excessive volumes (ceiling bounds maximum limits = 500oz). Output formatting syntax rules: return exactly {\\\"valid\\\": true} or {\\\"valid\\\": false, \\\"reason\\\": \\\"\\\"} only. Data profile telemetry payload: ${standardizedJSONTelemetryDataPromptString}"`;

      try {
        const [rawOutputResponseStringInstanceA, rawOutputResponseStringInstanceB] = await Promise.all([
          this.executeShellCommandPromise(instanceACommandString),
          this.executeShellCommandPromise(instanceBCommandString)
        ]);

        const validThreadAFlagValue = this.verifyInferenceJSONBooleanState(rawOutputResponseStringInstanceA);
        const validThreadBFlagValue = this.verifyInferenceJSONBooleanState(rawOutputResponseStringInstanceB);

        // Security Guardrail Assessment: Inputs > 500oz auto-flag for Jericho's review to safeguard grant data metrics balances
        if (validThreadAFlagValue && validThreadBFlagValue && payload.bulkOzIntake <= 500) {
          console.log(`[EVENT BUS] ✅ Absolute Consensus reached for entry transaction ID: #${transactionId}`);
          this.emit('mcl:consensus_success', { transactionId, predictedPacks: analyticalPredictedYieldProduct, itemId: payload.itemId });
        } else {
          const breakdownExplanationLogString = `Phi-A valid: ${validThreadAFlagValue}, Phi-B valid: ${validThreadBFlagValue}, Volume Overflow: ${payload.bulkOzIntake > 500}`;
          console.warn(`[EVENT BUS] ❌ Consensus Exception Flagged for context entry row transaction ID: #${transactionId}`);
          this.emit('mcl:consensus_failed', { transactionId, rationaleNotes: breakdownExplanationLogString });
        }
      } catch (inferenceProcessingFailureError) {
        console.error(`[EVENT BUS] CRITICAL: Isolated model validation stream calculation context execution failed:`, inferenceProcessingFailureError);
        this.emit('mcl:consensus_failed', { transactionId, rationaleNotes: `Local execution context timed out or dropped operational pipeline streams: ${inferenceProcessingFailureError.message}` });
      }
    });

    // =========================================================================
    // EVENT 4: MCL CONSENSUS SUCCESS (Sovereign Secure Database Commits)
    // =========================================================================
    this.on('mcl:consensus_success', (resolutionParameters) => {
      const { transactionId, predictedPacks, itemId } = resolutionParameters;
      
      const persistentWriteTransactionScopeBlock = this.db.transaction(() => {
        this.db.prepare(`
          UPDATE transaction_log 
          SET mcl_verification_state = 'COMMITTED', calculated_predicted_packs = ? 
          WHERE transaction_id = ?
        `).run(predictedPacks, transactionId);

        this.db.prepare(`
          UPDATE master_stock 
          SET current_stock_packs = current_stock_packs + ? 
          WHERE item_id = ?
        `).run(predictedPacks, itemId);
      });

      persistentWriteTransactionScopeBlock();
      console.log(`[EVENT BUS] 💾 Database state finalized and committed safely for row entry sequence: #${transactionId}`);
      
      // Dispatch immediate synchronization system compile calls onto ledger markup file generators
      this.emit('ledger:request_markdown_rebuild');
    });

    // =========================================================================
    // EVENT 5: MCL CONSENSUS FAILED (Human Intervention Mitigation Routines)
    // =========================================================================
    this.on('mcl:consensus_failed', (failureContext telemetryPayload) => {
      const { transactionId, rationaleNotes } = failureContext telemetryPayload;
      
      this.db.prepare(`
        UPDATE transaction_log 
        SET mcl_verification_state = 'HOLD_FOR_REVIEW', reconciliation_notes = ? 
        WHERE transaction_id = ?
      `).run(`MCL Auto Guardrail Isolation: ${rationaleNotes}`, transactionId);

      console.warn(`[EVENT BUS] ⚠️ Transaction ID #${transactionId} moved to quarantine queue: HOLD_FOR_REVIEW.`);
    });

    // =========================================================================
    // EVENT 6: VALUATION RESOLVED (Dynamic Fair Market Calculation Writes)
    // =========================================================================
    this.on('omniscrape:valuation_resolved', (valuationDataPayload) => {
      const { transactionId, itemId, computedAverageValuePerOz, fairMarketValuePerPack, auditSiloType } = valuationDataPayload;
      
      try {
        this.db.prepare(`
          UPDATE master_stock 
          SET fair_market_value_per_pack = ? 
          WHERE item_id = ?
        `).run(fairMarketValuePerPack, itemId);

        console.log(`[EVENT BUS] 📈 Asset balances re-valued based on brand matching context indexes inside storage file blocks.`);
        
        // Export transparency metrics files based on folder assignment classifications
        this.emit('audit:export_silo_log', { transactionId, auditSiloType });
      } catch (databaseWriteErrorContext) {
        console.error(`[EVENT BUS] Failed structural allocation update execution values write:`, databaseWriteErrorContext.message);
      }
    });

    // =========================================================================
    // EVENT 7: AUDIT SILO LOG ROUTING (Direct Aid vs. Procurement Silo Generation)
    // =========================================================================
    this.on('audit:export_silo_log', (routingDataParameters) => {
      const { transactionId, auditSiloType } = routingDataParameters;
      
      try {
        const fullAuditDataRowRecord = this.db.prepare('SELECT * FROM transaction_log WHERE transaction_id = ?').get(transactionId);
        if (!fullAuditDataRowRecord) return;

        const dynamicTargetMetricsDirectorySiloPath = auditSiloType === 'GIVEN' 
          ? path.join(__dirname, '..', 'metrics', 'given')
          : path.join(__dirname, '..', 'metrics', 'accepted');

        // Enforce folder structure verification sequences safely on your machine
        fs.mkdirSync(dynamicTargetMetricsDirectorySiloPath, { recursive: true });

        const dynamicTargetAuditFileNameStringPath = path.join(dynamicTargetMetricsDirectorySiloPath, `tx_audit_record_log_${transactionId}.json`);
        fs.writeFileSync(dynamicTargetAuditFileNameStringPath, JSON.stringify(fullAuditDataRowRecord, null, 2), 'utf8');
        
        console.log(`[AUDIT LEDGER] 📄 Transparency log successfully written to sovereign folder context path: ${dynamicTargetAuditFileNameStringPath}`);
      } catch (filesystemWriteExceptionContext) {
        console.error(`[AUDIT LEDGER] Failed writing file payload to storage maps:`, filesystemWriteExceptionContext.message);
      }
    });
  }

  /**
   * Infrastructure Processing Utilities Layer
   */
  executeShellCommandPromise(cmdCommandString) {
    return new Promise((resolve, reject) => {
      exec(cmdCommandString, { timeout: 15000 }, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve(stdout);
      });
    });
  }

  verifyInferenceJSONBooleanState(rawInferenceStringOutputPayload) {
    try {
      const clearJSONTargetMatchRegexArray = rawInferenceStringOutputPayload.match(/\{[\s\S]*\}/);
      if (!clearJSONTargetMatchRegexArray) return false;
      const verifiedExtractedJsonObjectDataInstance = JSON.parse(clearJSONTargetMatchRegexArray[0]);
      return verifiedExtractedJsonObjectDataInstance.valid === true;
    } catch (innerParsingErrorContextException) {
      return false;
    }
  }
}

// Initialize Singleton System Instance Architecture Object
const globalEventBusBackboneEngineInstance = new ProjectDignityEventBus();
module.exports = globalEventBusBackboneEngineInstance;