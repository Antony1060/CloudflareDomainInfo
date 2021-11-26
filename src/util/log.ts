import chalk from "chalk";

const Levels = {
    INFO: chalk.bgBlueBright.black` INFO `,
    WARN: chalk.bgYellowBright.black` WARN `,
    DEBUG: chalk.bgYellow.black` DEBUG `,
    ERROR: chalk.bgRedBright.black` ERROR `
};

export type Level = keyof typeof Levels 

export const time = (): string => {
    const date = new Date();
    const h = date.getHours().toString().padStart(2, "0");
    const min = date.getMinutes().toString().padStart(2, "0");
    const s = date.getSeconds().toString().padStart(2, "0");
    return `${h}:${min}:${s}`;
};

export function log(level: Level, message = ""): void  {
    if(level !== "DEBUG" || (level === "DEBUG" && process.env.DEBUG === "true"))
        console.log(`${time()} ${Levels[level]} ${message}`);
}