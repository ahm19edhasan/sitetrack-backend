import { Pool } from "pg";

export function createPool(): Pool {
    return new Pool({
        max: 10,
        connectionTimeoutMillis: 3_000,
        idleTimeoutMillis: 30_000
    });
}