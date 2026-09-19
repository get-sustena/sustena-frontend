import type { SQLiteDatabase } from "expo-sqlite";

export async function saveSyncIdMapping(
  db: SQLiteDatabase,
  temporaryId: string,
  serverId: string,
  entityKind: "shopping_list_item"
) {
  await db.runAsync(
    `
    INSERT INTO sync_id_mappings (
      temporary_id,
      server_id,
      entity_kind,
      created_at
    ) VALUES (?, ?, ?, ?)
    ON CONFLICT(temporary_id) DO UPDATE SET
      server_id = excluded.server_id,
      entity_kind = excluded.entity_kind
    `,
    [temporaryId, serverId, entityKind, new Date().toISOString()]
  );
}

export async function resolveSyncIdMapping(
  db: SQLiteDatabase,
  temporaryId: string,
  entityKind: "shopping_list_item"
) {
  const mapping = await db.getFirstAsync<{ server_id: string }>(
    `
    SELECT server_id
    FROM sync_id_mappings
    WHERE temporary_id = ? AND entity_kind = ?
    LIMIT 1
    `,
    [temporaryId, entityKind]
  );
  return mapping?.server_id ?? null;
}
