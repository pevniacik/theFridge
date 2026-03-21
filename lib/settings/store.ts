/**
 * lib/settings/store.ts
 * Persistence layer for LLM provider configuration.
 * All functions are synchronous (better-sqlite3 is sync-only).
 */

import { getDb } from "@/lib/db/client";
import type { LlmProvider, LlmProviderConfig } from "@/lib/settings/types";

type RawRow = {
  provider: LlmProvider;
  api_key: string;
  model: string;
  is_active: number;
};

function rowToConfig(row: RawRow): LlmProviderConfig {
  return {
    provider: row.provider,
    api_key: row.api_key,
    model: row.model,
    is_active: row.is_active === 1,
  };
}

export function getActiveProvider(): LlmProviderConfig | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM llm_providers WHERE is_active = 1 LIMIT 1")
    .get() as RawRow | undefined;
  return row ? rowToConfig(row) : null;
}

export function getAllProviders(): LlmProviderConfig[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM llm_providers ORDER BY provider")
    .all() as RawRow[];
  return rows.map(rowToConfig);
}

export function upsertProvider(config: {
  provider: LlmProvider;
  api_key: string;
  model: string;
}): void {
  const db = getDb();
  const insert = db.prepare(
    "INSERT OR REPLACE INTO llm_providers (provider, api_key, model, is_active) VALUES (?, ?, ?, 1)"
  );
  const deactivateOthers = db.prepare(
    "UPDATE llm_providers SET is_active = 0 WHERE provider != ?"
  );

  db.transaction(() => {
    insert.run(config.provider, config.api_key, config.model);
    deactivateOthers.run(config.provider);
  })();
}

export function setActiveProvider(provider: LlmProvider): void {
  const db = getDb();
  const deactivateAll = db.prepare(
    "UPDATE llm_providers SET is_active = 0"
  );
  const activate = db.prepare(
    "UPDATE llm_providers SET is_active = 1 WHERE provider = ?"
  );

  db.transaction(() => {
    deactivateAll.run();
    const result = activate.run(provider);
    if (result.changes === 0) {
      throw new Error(`Provider "${provider}" not found`);
    }
  })();
}
