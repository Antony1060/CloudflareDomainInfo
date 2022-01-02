import chalk from "chalk";
import { createLogger } from "@lvksh/logger";

export const log = createLogger({
    INFO: chalk.bgBlueBright.black` INFO `,
    WARN: chalk.bgYellowBright.black` WARN `,
    DEBUG: chalk.bgYellow.black` DEBUG `,
    ERROR: chalk.bgRedBright.black` ERROR `
}, {});

export const time = (): string => {
    const date = new Date();
    const h = date.getHours().toString().padStart(2, "0");
    const min = date.getMinutes().toString().padStart(2, "0");
    const s = date.getSeconds().toString().padStart(2, "0");
    return `${h}:${min}:${s}`;
};