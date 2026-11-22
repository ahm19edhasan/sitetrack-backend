import { createApp } from "./app.js";
import { migrate } from "./db/migrate.js";
import { createPool } from "./db/pool.js";

async function main(): Promise<void> {
    const port = Number(process.env.PORT ?? 3000);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("PORT must be an integer between 1 and 65535");
    }

    const pool = createPool();

    pool.on("error", () => {
        console.error("An idle PostgreSQL connection failed");
    });

    try {
        await migrate(pool);
    } catch (error) {
        await pool.end();
        throw error;
    }

    const server = createApp(pool).listen(port, "0.0.0.0", () => {
        console.log(`SiteTrack API listening on port ${port}`);
    });

    let closing = false;

    function shutdown(): void {
        if (closing) return;
        closing = true;

        server.close(async (error) => {
            try {
                await pool.end();
            } finally {
                process.exitCode = error ? 1 : 0;
            }
        });
    }

    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Startup failed: ${message}`);
    process.exitCode = 1;
});