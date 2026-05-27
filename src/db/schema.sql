-- ============================================================
-- CoreCount — SQLite Schema (all tables)
-- Project Dignity Hobbs C.O.R.E. Engine
-- ============================================================
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ============================================================
-- Table 1: clients
-- Core client registry with resource cooldown timestamps
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
    client_id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    family_size INTEGER NOT NULL DEFAULT 1,
    last_hygiene_date TEXT,
    last_laundry_date TEXT,
    last_cleaning_date TEXT,
    last_special_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Table 2: inventory
-- Bulk material tracking with yield math support
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    item_brand TEXT,
    material_category TEXT CHECK(material_category IN ('Hygiene', 'Laundry', 'Cleaning', 'Special')),
    bulk_ounces_total REAL DEFAULT 0.0,
    unit_conversion_factor REAL DEFAULT 0.0,
    expected_yield_units INTEGER DEFAULT 0,
    actual_distributed_units INTEGER DEFAULT 0,
    current_stock_on_hand INTEGER DEFAULT 0,
    unit_fair_market_value REAL DEFAULT 0.0,
    min_threshold INTEGER DEFAULT 5,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Table 3: transactions
-- Every dispense action is logged here
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT,
    category TEXT CHECK(category IN ('Hygiene', 'Laundry', 'Cleaning', 'Special')),
    item_id INTEGER,
    units_dispensed INTEGER DEFAULT 1,
    emergency_bypass INTEGER DEFAULT 0,
    volunteer_name TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(client_id),
    FOREIGN KEY(item_id) REFERENCES inventory(item_id)
);

-- ============================================================
-- Table 4: volunteer_submissions
-- Volunteer onboarding with emergency contact and minor support
-- ============================================================
CREATE TABLE IF NOT EXISTS volunteer_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    volunteer_name TEXT NOT NULL,
    emergency_contact TEXT NOT NULL,
    emergency_phone TEXT NOT NULL,
    relationship TEXT NOT NULL,
    signature_capture TEXT NOT NULL,  -- digital signature trace or confirmation token
    submission_date TEXT DEFAULT CURRENT_TIMESTAMP,
    is_minor INTEGER DEFAULT 0,       -- 1 if volunteer is under 18
    parent_signature TEXT             -- NULL for adults, filled for minors
);

-- ============================================================
-- Table 5: transaction_log
-- Event Bus verification and audit state tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS transaction_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT UNIQUE NOT NULL,
    operator_signature TEXT,
    item_id INTEGER,
    item_brand TEXT,
    item_category TEXT,
    bulk_oz_intake REAL,
    conversion_yield_oz REAL,
    calculated_predicted_packs INTEGER,
    mcl_verification_state TEXT DEFAULT 'PENDING'
        CHECK(mcl_verification_state IN ('PENDING', 'COMMITTED', 'HOLD_FOR_REVIEW')),
    reconciliation_notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(item_id) REFERENCES inventory(item_id)
);

-- ============================================================
-- Table 6: master_stock
-- Valuation index for Event Bus fair market pricing
-- ============================================================
CREATE TABLE IF NOT EXISTS master_stock (
    item_id INTEGER PRIMARY KEY,
    current_stock_packs INTEGER DEFAULT 0,
    fair_market_value_per_pack REAL DEFAULT 0.0,
    last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(item_id) REFERENCES inventory(item_id)
);

-- ============================================================
-- Table 7: donors
-- Donor directory for low-stock notification system
-- ============================================================
CREATE TABLE IF NOT EXISTS donors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    alert_enabled INTEGER DEFAULT 1,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Table 8: batches
-- Decant log — bulk → kit yield conversion history
-- ============================================================
CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supply_id INTEGER NOT NULL,
    batch_date TEXT DEFAULT CURRENT_TIMESTAMP,
    bulk_oz_input REAL NOT NULL,
    kits_yielded INTEGER NOT NULL,
    operator TEXT,
    notes TEXT,
    FOREIGN KEY(supply_id) REFERENCES inventory(item_id)
);

-- ============================================================
-- Table 9: drafts
-- AI-generated low-stock outreach drafts awaiting review
-- ============================================================
CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draft_type TEXT CHECK(draft_type IN ('social', 'email')),
    subject TEXT,
    body TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'sent', 'dismissed')),
    trigger_item_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TEXT,
    FOREIGN KEY(trigger_item_id) REFERENCES inventory(item_id)
);

-- ============================================================
-- Table 10: ai_provider_config (swap-ready model registry)
-- When Qualcomm models are ready, register them here.
-- The AI provider layer reads from this table at runtime.
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_provider_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL UNIQUE,   -- e.g. 'intake_parser', 'consensus_a', 'consensus_b', 'valuation'
    provider TEXT DEFAULT 'placeholder',  -- 'placeholder' | 'qualcomm' | 'ollama'
    model_name TEXT,
    endpoint TEXT,
    notes TEXT,
    active INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Seed default placeholder rows for all AI roles
INSERT OR IGNORE INTO ai_provider_config (role, provider, model_name, notes) VALUES
    ('intake_parser',  'placeholder', NULL, 'Parses raw donation intake text into structured supply records'),
    ('consensus_a',    'placeholder', NULL, 'First validation thread — checks bounds and category fit'),
    ('consensus_b',    'placeholder', NULL, 'Second validation thread — flags volume overflows'),
    ('valuation',      'placeholder', NULL, 'Computes fair market value per oz from brand/category context'),
    ('draft_writer',   'placeholder', NULL, 'Writes low-stock social and email outreach drafts');
