# Technical Architecture Specification: Local C.O.R.E. Engine

## 1. Environment & Network Configuration
* **Database Target:** SQLite3 (`/data/pdh_core.db`)
* **Local Backend API:** Node.js Express server running on `http://localhost:5000`
* **Local AI Infrastructure:** Ollama running `qwen2.5:7b-instruct` on `http://localhost:11434`
* **Network Strategy:** PWA clients on the local field network interact with the local host machine IP via standard REST endpoints. All operations must fallback gracefully to local client state during zero-connectivity intervals.

---

## 2. Relational Database Schemas (SQLite DDL)

```sql
CREATE TABLE IF NOT EXISTS clients (
    client_id TEXT PRIMARY KEY,
    first_name TEXT,
    family_size INTEGER,
    last_hygiene_date TEXT,
    last_laundry_date TEXT,
    last_cleaning_date TEXT,
    last_special_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    material_category TEXT CHECK(material_category IN ('Hygiene', 'Laundry', 'Cleaning', 'Special')),
    bulk_ounces_total REAL DEFAULT 0.0,
    unit_conversion_factor REAL DEFAULT 0.0,
    expected_yield_units INTEGER DEFAULT 0,
    actual_distributed_units INTEGER DEFAULT 0,
    current_stock_on_hand INTEGER DEFAULT 0,
    unit_fair_market_value REAL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT,
    category TEXT CHECK(category IN ('Hygiene', 'Laundry', 'Cleaning', 'Special')),
    item_id INTEGER,
    units_dispensed INTEGER DEFAULT 1,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(client_id),
    FOREIGN KEY(item_id) REFERENCES inventory(item_id)
);