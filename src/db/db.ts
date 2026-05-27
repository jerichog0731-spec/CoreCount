/**
 * CoreCount — Database Interface
 * Uses better-sqlite3 for synchronous, local-first SQLite access.
 * Automatically initializes schema on first run.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.env.DATABASE_PATH ?? 'data/pdh_core.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Ensure the data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize the database connection
const db: Database.Database = new Database(DB_PATH, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

// Apply PRAGMA settings for performance and safety
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Run schema initialization on first boot
function initializeSchema(): void {
  try {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema);
    console.log('[DB] ✅ Schema initialized at:', DB_PATH);
  } catch (err) {
    console.error('[DB] ❌ Schema initialization failed:', err);
    process.exit(1);
  }
}

initializeSchema();

// ─── Safe column migrations (non-destructive ALTER TABLE) ────────────────
// Adds new columns to existing databases without wiping data.
function runMigrations(): void {
  const migrations: Array<{ name: string; sql: string }> = [
    {
      name: 'add_internal_notes_to_clients',
      sql: `ALTER TABLE clients ADD COLUMN internal_notes TEXT`,
    },
    {
      name: 'add_total_distributions_to_clients',
      sql: `ALTER TABLE clients ADD COLUMN total_distributions_received INTEGER DEFAULT 0`,
    },
  ];

  for (const m of migrations) {
    try {
      db.prepare(m.sql).run();
      console.log(`[DB] ✅ Migration applied: ${m.name}`);
    } catch {
      // Column already exists — safe to ignore
    }
  }
}

runMigrations();

export default db;

// ─── Convenience helper types ───────────────────────────────

export type ClientRow = {
  client_id: string;
  first_name: string;
  family_size: number;
  last_hygiene_date: string | null;
  last_laundry_date: string | null;
  last_cleaning_date: string | null;
  last_special_date: string | null;
  internal_notes: string | null;               // Operator case notes
  total_distributions_received: number;         // Running distribution count
  created_at: string;
};

export type InventoryRow = {
  item_id: number;
  item_name: string;
  item_brand: string | null;
  material_category: 'Hygiene' | 'Laundry' | 'Cleaning' | 'Special';
  bulk_ounces_total: number;
  unit_conversion_factor: number;
  expected_yield_units: number;
  actual_distributed_units: number;
  current_stock_on_hand: number;
  unit_fair_market_value: number;
  min_threshold: number;
  created_at: string;
};

export type TransactionRow = {
  transaction_id: number;
  client_id: string;
  category: 'Hygiene' | 'Laundry' | 'Cleaning' | 'Special';
  item_id: number | null;
  units_dispensed: number;
  emergency_bypass: number;
  volunteer_name: string | null;
  timestamp: string;
};

export type TransactionLogRow = {
  id: number;
  transaction_id: string;
  operator_signature: string | null;
  item_id: number | null;
  item_brand: string | null;
  item_category: string | null;
  bulk_oz_intake: number | null;
  conversion_yield_oz: number | null;
  calculated_predicted_packs: number | null;
  mcl_verification_state: 'PENDING' | 'COMMITTED' | 'HOLD_FOR_REVIEW';
  reconciliation_notes: string | null;
  created_at: string;
};

export type DraftRow = {
  id: number;
  draft_type: 'social' | 'email';
  subject: string | null;
  body: string;
  status: 'pending' | 'approved' | 'sent' | 'dismissed';
  trigger_item_id: number | null;
  created_at: string;
  reviewed_at: string | null;
};

export type VolunteerRow = {
  id: number;
  volunteer_name: string;
  emergency_contact: string;
  emergency_phone: string;
  relationship: string;
  signature_capture: string;
  submission_date: string;
  is_minor: number;
  parent_signature: string | null;
};
