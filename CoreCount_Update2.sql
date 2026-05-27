CREATE TABLE IF NOT EXISTS volunteer_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    volunteer_name TEXT NOT NULL,
    emergency_contact TEXT NOT NULL,
    emergency_phone TEXT NOT NULL,
    relationship TEXT NOT NULL,
    signature_capture TEXT NOT NULL, -- Stores digital signature trace or confirmation timestamp
    submission_date TEXT DEFAULT CURRENT_TIMESTAMP,
    is_minor INT DEFAULT 0,          -- 1 if volunteer is under 18
    parent_signature TEXT            -- NULL if adult, filled if minor
);