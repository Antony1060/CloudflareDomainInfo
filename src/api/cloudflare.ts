import axios from 'axios';
import { formatMs } from '../lib/time';
import { log } from '../util/log';

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
    erorrs: string[],
    messages: string[],
    result: CloudflareZone[]
}

// cloudflare response with everything important to us typed
type CloudflareZone = {
    name: string,
    status: string
}

const checkDomain = async (domain: CloudflareZone): Promise<boolean> => {
    if(process.env.CHECK_DOMAINS!.toLowerCase() !== "true") return Promise.resolve(true);
    return axios.head(`https://${domain.name}`).then(() => true).catch(() => false)
}

const fetchAllDomains = async (page = 1): Promise<CloudflareZone[]> => {
    const start = Date.now();
    if(page === 1)
        log("INFO", "Updating domains")
    const domains: CloudflareZone[] = await http.get(`/zones`, {
        params: {
            match: "all",
            per_page: 50,
            page
        }
    }).then(({ data }: { data: CloudflareZonesResponse }) => {
        if(!data.success) return [];
        return Promise.all(data.result.map(async domain => ({
            name: domain.name,
            status: domain.status !== "active" ? domain.status : !(await checkDomain(domain)) ? "invalid" : "active"
        })))
    }).catch((err) => {
        log("ERROR", err);
        return [];
    });
    if(domains.length > 0)
        domains.push(...(await fetchAllDomains(page + 1)));

    if(page === 1)
        log("INFO", `Found ${domains.length} zones, took ${formatMs(Date.now() - start)}`);
    return domains;
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