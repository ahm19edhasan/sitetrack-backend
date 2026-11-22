import express from "express";
import type { Pool } from "pg";

export function createApp(pool: Pool) {
    const app = express();
    app.disable("x-powered-by");

    app.get("/health", async (_request, response) => {
        response.set("Cache-Control", "no-store");

        try {
            await pool.query("SELECT 1");
            response.status(200).json({ status: "ready" });
        } catch {
            response.status(503).json({ status: "unavailable" });
        }
    });

    return app;
}