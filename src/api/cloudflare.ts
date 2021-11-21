import axios from 'axios';
import { log } from '../util/log';

let domainsCache: CloudflareZone[] | null = null;

// clear every 10 minutes
setInterval(() => {
    domainsCache = null;
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

// no support for pagination yet :(
export const getAllDomains = async ({ cache }: RequestOpts = { cache: true }) => {
    if(cache && domainsCache !== null)
        return domainsCache;

    const domains: CloudflareZone[] = await http.get(`/zones`, {
        params: {
            match: "all",
            per_page: "50"
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

    domainsCache = domains;
    return domains;
}