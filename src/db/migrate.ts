import { readdir, readFile } from "node:fs/promises";
import type { Pool } from "pg";

const directory = new URL("../../db/migrations/", import.meta.url);

export async function migrate(pool: Pool): Promise<void> {
    const files = (await readdir(directory))
        .filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name))
        .sort();

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // All SiteTrack instances use the same transaction-scoped migration lock.
        await client.query("SELECT pg_advisory_xact_lock(48210701)");

        await client.query(`
          CREATE TABLE IF NOT EXISTS schema_migrations (
            filename text PRIMARY KEY,
            applied_at timestamptz NOT NULL DEFAULT now()
          )
        `);

        const result = await client.query<{ filename: string }>(
            "SELECT filename FROM schema_migrations"
        );
        const applied = new Set(result.rows.map((row) => row.filename));

        for (const filename of files) {
            if (applied.has(filename)) continue;

            const sql = await readFile(new URL(filename, directory), "utf8");
            await client.query(sql);
            await client.query(
                "INSERT INTO schema_migrations (filename) VALUES ($1)",
                [filename]
            );
        }

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}