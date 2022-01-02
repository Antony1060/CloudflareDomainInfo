import chalk from "chalk";
import { createLogger } from "@lvksh/logger";

export const log = createLogger({
    INFO: chalk.bgBlueBright.white` INFO `,
    WARN: chalk.bgYellowBright.white` WARN `,
    DEBUG: chalk.bgYellow.white` DEBUG `,
    ERROR: chalk.bgRedBright.white` ERROR `,
    PING: chalk.bgGreen.white` PING `,
}, {});

export const time = (): string => {
    const date = new Date();
    const h = date.getHours().toString().padStart(2, "0");
    const min = date.getMinutes().toString().padStart(2, "0");
    const s = date.getSeconds().toString().padStart(2, "0");
    return `${h}:${min}:${s}`;
};