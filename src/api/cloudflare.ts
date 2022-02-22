import { createLogger } from "@lvksh/logger";
import axios, { AxiosResponse } from "axios";
import chalk from "chalk";
import { inspect } from "node:util";

import { formatMs } from "../lib/time";
import topSecretFinancialData from "../pricing.json";
import { log } from "../util/log";

let lastUpdated: number = Date.now();
let domainsCache: CloudflareZone[] = [];

// update every 10 minutes
setInterval(() => {
    updateLocalCache();
}, 10 * 60 * 1000);

const http = axios.create({
    baseURL: "https://api.cloudflare.com/client/v4/",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CF_KEY}`,
    },
});

type RequestOptions = {
    cache: boolean;
};

type CloudflareZonesResponse = {
    success: boolean;
    errors: string[];
    messages: string[];
    result: CloudflareZone[];
};

// cloudflare response with everything important to us typed
type CloudflareZone = {
    name: string;
    status: string;
};

const checkDomain = async (domain: CloudflareZone): Promise<boolean> => {
    log.PING(domain.name + " " + chalk.grey`CHECKING`);

    if (process.env.CHECK_DOMAINS!.toLowerCase() !== "true") return true;

    const result = await axios
        .head(`https://${domain.name}`, {
            timeout: +(process.env.TIMEOUT ?? 5000),
        })
        .then(() => true)
        .catch((error) =>
            error.response?.status ? error.response?.status < 500 : false
        );

    log.PING(
        domain.name + " " + (result ? chalk.green`OK` : chalk.red`OFFLINE`)
    );

    return result;
};

const fetchAllDomains = async (page = 1): Promise<CloudflareZone[]> => {
    const start = Date.now();

    if (page === 1) log.INFO("Updating domains");
    else log.INFO("Fetching page " + page);

    const domains: AxiosResponse<CloudflareZonesResponse> = await http.get(
        "/zones",
        {
            params: {
                match: "all",
                per_page: 50,
                page,
            },
        }
    );

    if (domains.status !== 200) {
        log.ERROR("Non 200 error code");

        return [];
    }

    const domainData: CloudflareZone[] = [];

    if (!domains.data.result) {
        log.INFO("Not successful", inspect(domains, true, 1));

        return [];
    }

    for (let index = 0; index < domains.data.result.length; index++) {
        log.PING(index.toString() + " / " + (domains.data.result.length - 1));
        const data = domains.data.result[index];
        const resolvedData = {
            name: data.name,
            status:
                data.status !== "active"
                    ? data.status
                    : !(await checkDomain(data))
                    ? "invalid"
                    : "active",
        };

        domainData.push(resolvedData);
    }

    if (domainData.length > 0)
        domainData.push(...(await fetchAllDomains(page + 1)));

    if (page === 1)
        log.INFO(
            `Found ${domainData.length} zones, took ${formatMs(
                Date.now() - start
            )}`
        );

    const relativeTopSecretFinancialData = topSecretFinancialData as Record<
        string,
        string
    >;
    const tldRoster: Record<string, number> = {};
    const missingTLD: string[] = [];
    let totalSecretBudgetValueThing: bigint = BigInt(0);

    for (const zone of domainData) {
        const theTLDRINQUESTION = zone.name.split(".").pop() || "";

        tldRoster[theTLDRINQUESTION] = (tldRoster[theTLDRINQUESTION] || 0) + 1;

        if (relativeTopSecretFinancialData[theTLDRINQUESTION]) {
            totalSecretBudgetValueThing =
                totalSecretBudgetValueThing +
                BigInt(
                    Math.round(
                        Number.parseFloat(
                            relativeTopSecretFinancialData[theTLDRINQUESTION] ||
                                "0"
                        ) * 100
                    )
                );
        } else {
            missingTLD.push(theTLDRINQUESTION);
        }
    }

    log.DEBUG("Missing Financial Data about ", new Set(missingTLD));
    log.DEBUG(
        "Total Predicted Cost",
        totalSecretBudgetValueThing
            .toString()
            .slice(0, totalSecretBudgetValueThing.toString().length - 2) +
            "." +
            totalSecretBudgetValueThing
                .toString()
                .slice(totalSecretBudgetValueThing.toString().length - 2)
    );

    const tldRosterFilter = Object.keys(tldRoster)
        .map((thatkeything) => ({
            key: thatkeything,
            value: tldRoster[thatkeything],
        }))
        .sort(
            (thefirstone, thesecondone) =>
                thesecondone.value - thefirstone.value
        );

    const logConfig = Object.assign(
        { title: chalk.bold`TLD` },
        ...Object.keys(tldRoster).map((yetanotherkeytorefactorshrug) => ({
            [yetanotherkeytorefactorshrug]: yetanotherkeytorefactorshrug,
        }))
    );

    const yeahKindaWannaCallThisLoggerButNah = createLogger(logConfig, {
        padding: "PREPEND",
    });

    console.log();
    yeahKindaWannaCallThisLoggerButNah.title("Frequency");

    for (const kevinWasHere of tldRosterFilter) {
        yeahKindaWannaCallThisLoggerButNah[kevinWasHere.key](
            chalk.greenBright(
                "█".repeat(kevinWasHere.value) + " " + kevinWasHere.value
            )
        );
    }

    return domainData;
};

const updateLocalCache = async () => {
    domainsCache = await fetchAllDomains().finally(
        () => (lastUpdated = Date.now())
    );
};

// initial fetch
updateLocalCache();

export const getAllDomains = async (
    { cache }: RequestOptions = { cache: true }
): Promise<[number, CloudflareZone[]]> => {
    if (cache) return [lastUpdated, domainsCache];

    return [Date.now(), await fetchAllDomains()];
};
