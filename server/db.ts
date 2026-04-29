// Lightweight SQLite persistence layer.
//
// The app's domain data lives in MemStorage (server/storage.ts) for performance and
// schema simplicity. We persist it across server restarts by snapshotting the entire
// in-memory state into a single JSON blob in SQLite. Reads happen in memory; writes
// fan out to disk on a debounced schedule.
//
// File location is configurable via DATABASE_PATH (default: ./data.db relative to cwd).

import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DEFAULT_DB_PATH = process.env.DATABASE_PATH || path.resolve(process.cwd(), "data.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  const dir = path.dirname(DEFAULT_DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  _db = new Database(DEFAULT_DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("synchronous = NORMAL");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  return _db;
}

export function loadSnapshot(): Record<string, unknown> | null {
  const db = getDb();
  const row = db.prepare("SELECT data FROM app_state WHERE id = 1").get() as { data: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.data);
  } catch (e) {
    console.error("[db] failed to parse persisted state, ignoring:", e);
    return null;
  }
}

export function saveSnapshot(state: Record<string, unknown>): void {
  const db = getDb();
  const json = JSON.stringify(state);
  const now = Date.now();
  db.prepare(
    `INSERT INTO app_state (id, data, updated_at) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
  ).run(json, now);
}

// Debounced writer — collapses bursts of mutations into a single write.
let pending: NodeJS.Timeout | null = null;
let pendingState: Record<string, unknown> | null = null;

export function scheduleSnapshot(state: Record<string, unknown>, delayMs = 500): void {
  pendingState = state;
  if (pending) return;
  pending = setTimeout(() => {
    if (pendingState) {
      try {
        saveSnapshot(pendingState);
      } catch (e) {
        console.error("[db] snapshot write failed:", e);
      }
    }
    pending = null;
    pendingState = null;
  }, delayMs);
}

export function flushSnapshot(): void {
  if (pending) {
    clearTimeout(pending);
    pending = null;
  }
  if (pendingState) {
    saveSnapshot(pendingState);
    pendingState = null;
  }
}

// Flush on process exit so we never lose unflushed writes.
let exitHooked = false;
export function hookExitFlush(): void {
  if (exitHooked) return;
  exitHooked = true;
  const flush = () => { try { flushSnapshot(); } catch {} };
  process.on("beforeExit", flush);
  process.on("SIGINT", () => { flush(); process.exit(0); });
  process.on("SIGTERM", () => { flush(); process.exit(0); });
}
