// for autocomplete purposes
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PORT: string,
            CF_KEY: string
        }
    }
}

export {};