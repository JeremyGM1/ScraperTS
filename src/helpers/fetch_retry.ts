import type { Logger } from "pino";

const RETRYABLE_PATTERNS = [
    "ENOTFOUND",
    "ECONNRESET",
    "ETIMEOUT",
    "ECONNREFUSED",
    "EAI_AGAIN"
];

export function isRetryableError(err: unknown): boolean {
    const message = err instanceof Error ? err.message : String(err);
    return RETRYABLE_PATTERNS.some((pattern) => message.includes(pattern));
}

export interface RetryOptions {
    retries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    logger?: Logger;
    context?: Record<string, unknown>;
    isRetryable?: (err: unknown) => Boolean;
}

function sleep(ms : number){
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attemp: number, baseDelayMs: number, maxDelayMs: number) {
    const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** (attemp - 1));
    return Math.floor(Math.random() * exp);
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const {
        retries = 3,
        baseDelayMs = 500,
        maxDelayMs = 8000,
        logger,
        context = {},
        isRetryable = isRetryableError
    } = options;
    
    let lastError: unknown;
    
    for (let attemp = 1; attemp <= retries + 1; attemp++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            const retryable = isRetryable(err);
            const attempsLeft = retries + 1 - attemp;

            if (!retryable || attempsLeft <= 0) {
                logger?.error(
                    { ...context, err, attemp, retryable },
                    retryable ? "Retry attemps exausted" : "Non-retryable error, aborting"
                );
                throw err;
            }

            const delay = backoffDelay(attemp, baseDelayMs, maxDelayMs);
            logger?.warn(
                { ...context, err, attemp, attempsLeft, delayMs: delay },
                "Request failed, retrying"
            );
            await sleep(delay);
        }
    }

    throw lastError;
}

export function makeRetryable<Args extends unknown[], T>(
    fn: (...args: Args) => Promise<T>,
    options: Omit<RetryOptions, "context" | "logger"> & {
        scraper: string;
        getContext?: (...args: Args) => Record<string, unknown>;
        getLogger?: (...args: Args) => Logger | undefined;
    }
) {
    const { scraper, getContext, getLogger, ...retryOptions } = options;

    return (...args: Args): Promise<T> => {
        const extraContext = getContext ? getContext(...args) : {};
        const logger = getLogger ? getLogger(...args) : (args.find((a) => a && typeof a === "object" && "info" in a && "error" in a) as Logger | undefined);

        return withRetry(() => fn(...args), {
            ...retryOptions,
            logger,
            context: { scraper, ...extraContext },
        });
    };
}