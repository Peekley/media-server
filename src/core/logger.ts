import { LogLevel } from "../types";

export class Logger {
    private levels: LogLevel[] = [LogLevel.TRACE, LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    level: LogLevel;

    constructor(level: LogLevel = LogLevel.INFO) {
        this.level = level;
    }

    log(message: string, logLevel = LogLevel.INFO) {
        const messageLevel = logLevel;
        const currentLevel = this.levels.indexOf(this.level);

        if (messageLevel >= currentLevel) {
            console.log(`[${this.getTime()}] [${logLevel.toUpperCase()}] ${message}`);
        }
    }

    getTime() {
        const now = new Date();
        return now.toLocaleString();
    }

    /**
     * @param {string} message
     */
    trace(message: string) {
        this.log(message, LogLevel.TRACE);
    }

    /**
     * @param {string} message
     */
    debug(message: string) {
        this.log(message, LogLevel.DEBUG);
    }

    /**
     * @param {string} message
     */
    info(message: string) {
        this.log(message, LogLevel.INFO);
    }

    /**
     * @param {string} message
     */
    warn(message: string) {
        this.log(message, LogLevel.WARN);
    }

    /**
     * @param {string} message
     */
    error(message: string) {
        this.log(message, LogLevel.ERROR);
    }
}