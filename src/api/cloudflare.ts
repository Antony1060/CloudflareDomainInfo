import axios, { AxiosResponse } from 'axios';
import { formatMs } from '../lib/time';
import { log } from '../util/log';
import { inspect } from 'util';
import chalk from 'chalk';

let lastUpdated: number = Date.now();
let domainsCache: CloudflareZone[] = [];

// update every 10 minutes
setInterval(() => {
    updateLocalCache()
}, 10 * 60 * 1000)

const http = axios.create({
    baseURL: "https://api.cloudflare.com/client/v4/",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.CF_KEY}`
    }
})

type RequestOpts = {
    cache: boolean
}

type CloudflareZonesResponse = {
    success: boolean,
    errors: string[],
    messages: string[],
    result: CloudflareZone[]
}

// cloudflare response with everything important to us typed
type CloudflareZone = {
    name: string,
    status: string
}

const checkDomain = async (domain: CloudflareZone): Promise<boolean> => {
    log.PING(domain.name + ' ' + chalk.grey`CHECKING`);

    if(process.env.CHECK_DOMAINS!.toLowerCase() !== "true") return Promise.resolve(true);
    const result = await axios.head(`https://${domain.name}`).then(() => true).catch(() => false);

    log.PING(domain.name + ' ' + (result ? chalk.green`OK` : chalk.red`OFFLINE`));

    return result;
}

const fetchAllDomains = async (page = 1): Promise<CloudflareZone[]> => {
    const start = Date.now();
    if(page === 1)
        log.INFO("Updating domains")
    else
        log.INFO("Fetching page " + page);
    
    const domains: AxiosResponse<CloudflareZonesResponse> = await http.get(`/zones`, {
        params: {
            match: "all",
            per_page: 50,
            page
        }
    });

    if (domains.status !== 200) {
        log.ERROR('Non 200 error code');
        return [];
    }

    const domainData: CloudflareZone[] = [];

    if (!domains.data.result) {
        log.INFO("Not successful", inspect(domains, true, 1));
        return [];
    }

    for (let i = 0; i <= domains.data.result.length; i++) {
        log.PING(i.toString() + " / " + (domains.data.result.length-1));
        const data = domains.data.result[i];
        const resolvedData = { name: data.name, status: (await checkDomain(data) ? "invalid" : "inactive") };
        domainData.push(resolvedData);
    }
    
    if(domainData.length > 0)
        domainData.push(...(await fetchAllDomains(page + 1)));

    if(page === 1)
        log.INFO(`Found ${domainData.length} zones, took ${formatMs(Date.now() - start)}`);
    return domainData;
}

const updateLocalCache = async () => {
    domainsCache = await fetchAllDomains().finally(() => lastUpdated = Date.now())
}

// initial fetch
updateLocalCache()

export const getAllDomains = async ({ cache }: RequestOpts = { cache: true }): Promise<[number, CloudflareZone[]]> => {
    if(cache)
        return [lastUpdated, domainsCache];

    return [Date.now(), await fetchAllDomains()];
}