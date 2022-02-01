import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import cors from "cors";
import Express from "express";

import { getAllDomains } from "./api/cloudflare";
import { formatFromNow } from "./lib/time";
import { log } from "./util/log";

const app = Express();

app.use(cors({ origin: "*" }));

app.get("/", async (_, res) => {
    const [lastUpdated, domains] = await getAllDomains();

    res.status(200).json({
        status: 200,
        lastUpdated,
        lastUpdatedFormat: formatFromNow(lastUpdated),
        domains,
    });
});

app.use((_, res) => {
    res.status(404).json({
        status: 404,
    });
});

app.listen(process.env.PORT, () => {
    log.INFO(`Listening on ${process.env.PORT}`);
});
