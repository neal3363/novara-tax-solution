-- EXAMPLE D1 schema — durable MeF submission tracking & audit indexes.
-- Taxpayer document bodies belong in R2 (encrypted), not inline TEXT blobs.

CREATE TABLE IF NOT EXISTS mef_submissions (
  submission_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  tax_year INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  ack_source TEXT,
  simulated INTEGER NOT NULL DEFAULT 1,
  live_irs INTEGER NOT NULL DEFAULT 0,
  correction_of TEXT,
  duplicate_of TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  transmitted_at TEXT,
  acknowledged_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mef_content_hash_active
  ON mef_submissions (content_hash)
  WHERE transmitted_at IS NOT NULL AND status NOT IN ('rejected', 'correction_required');

CREATE TABLE IF NOT EXISTS mef_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT,
  tenant_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL,
  meta_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mef_audit_tenant_time
  ON mef_audit_log (tenant_id, created_at);

CREATE TABLE IF NOT EXISTS tenant_isolation_check (
  tenant_id TEXT PRIMARY KEY,
  account_tier TEXT NOT NULL,
  created_at TEXT NOT NULL
);
